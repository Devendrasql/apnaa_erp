const db = require('../../../../models');
const { Op } = require('sequelize');

const Product = db.products;
const ProductVariant = db.product_variants;
// ... other related models like Category, Brand, etc.

/**
 * ProductsServiceV2 handles all database operations for products and their variants.
 */
class ProductsServiceV2 {
    /**
     * Retrieves a list of products with optional filtering.
     * @param {object} filters - Filtering options.
     * @returns {Promise<Array>} A list of products.
     */
    static async getAllProducts(filters = {}) {
        // Here you can add logic to handle filters for search, pagination, etc.
        return Product.findAll({
            include: [
                { model: db.categories, as: 'category' },
                { model: db.brands, as: 'brand' }
            ]
        });
    }

    /**
     * Finds a single product by its ID, including its variants.
     * @param {number} productId - The ID of the product.
     * @returns {Promise<object|null>} The product object.
     */
    static async getProductById(productId) {
        return Product.findByPk(productId, {
            include: [
                { model: ProductVariant, as: 'variants' },
                { model: db.categories, as: 'category' },
                { model: db.brands, as: 'brand' }
            ]
        });
    }

    /**
     * Creates a new product and optionally its variants.
     * @param {object} productData - Data for the product.
     * @returns {Promise<object>} The newly created product.
     */
    static async createProduct(productData) {
        // You would add transaction logic here to ensure that if variant creation
        // fails, the product creation is rolled back.
        const { variants, ...mainProductData } = productData;
        const newProduct = await Product.create(mainProductData);

        if (variants && variants.length > 0) {
            const variantData = variants.map(v => ({ ...v, product_id: newProduct.id }));
            await ProductVariant.bulkCreate(variantData);
        }
        
        return this.getProductById(newProduct.id);
    }
    
    // ... You would create updateProduct and deleteProduct methods following a similar pattern.
}

module.exports = ProductsServiceV2;
