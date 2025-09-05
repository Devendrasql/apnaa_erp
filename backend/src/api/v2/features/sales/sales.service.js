const db = require('../../../../models');
const { Sequelize } = require('sequelize');

const Sale = db.sales;
const SaleItem = db.sale_items;
const ProductStock = db.product_stock;

/**
 * SalesServiceV2 handles all database operations for sales.
 * This service is critical and requires transaction management.
 */
class SalesServiceV2 {
    /**
     * Creates a new sale and updates inventory stock in a single transaction.
     * @param {object} saleData - The complete data for the new sale.
     * @param {object} saleData.sale - Main sale info (branch_id, customer_id, etc.)
     * @param {Array<object>} saleData.items - Array of items being sold.
     * @returns {Promise<object>} The newly created sale object.
     */
    static async createSale(saleData) {
        const t = await db.sequelize.transaction();
        try {
            const { sale, items } = saleData;

            // 1. Create the main sale record
            const newSale = await Sale.create(sale, { transaction: t });

            // 2. Prepare and create sale items
            const saleItemsData = items.map(item => ({
                ...item,
                sale_id: newSale.id,
            }));
            await SaleItem.bulkCreate(saleItemsData, { transaction: t });
            
            // 3. Decrement stock for each item
            for (const item of items) {
                await ProductStock.update(
                    { quantity_available: Sequelize.literal(`quantity_available - ${item.quantity}`) },
                    { where: { id: item.stock_id }, transaction: t }
                );
                // Optional: Check if stock went below zero and throw error if needed
            }

            // If everything is successful, commit the transaction
            await t.commit();
            
            // Return the newly created sale with its items
            return Sale.findByPk(newSale.id, { include: ['items'] });

        } catch (error) {
            // If any step fails, roll back the entire transaction
            await t.rollback();
            console.error("Sale creation failed:", error);
            throw new Error("Could not complete the sale. Inventory might be insufficient.");
        }
    }

    /**
     * Retrieves a list of all sales for a given branch.
     * @param {number} branchId - The ID of the branch.
     * @returns {Promise<Array>} A list of sales.
     */
    static async getSalesByBranch(branchId) {
        return Sale.findAll({
            where: { branch_id: branchId },
            include: [
                { model: db.customers, as: 'customer' },
                { model: SaleItem, as: 'items' }
            ],
            order: [['sale_date', 'DESC']]
        });
    }

    // ... other methods like getSaleById, cancelSale (which would reverse the transaction), etc.
}

module.exports = SalesServiceV2;
