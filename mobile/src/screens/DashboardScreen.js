import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, Surface } from 'react-native-paper';
import { useQuery } from 'react-query';
import axios from 'axios';

const StatCard = ({ title, value, color = '#1976d2' }) => (
  <Surface style={[styles.statCard, { borderLeftColor: color }]}>
    <Title style={styles.statValue}>{value}</Title>
    <Paragraph style={styles.statTitle}>{title}</Paragraph>
  </Surface>
);

const DashboardScreen = () => {
  const { data: stats, isLoading } = useQuery(
    'dashboardStats',
    () => axios.get('/api/dashboard/stats'),
    {
      select: (response) => response.data.data,
    }
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Dashboard</Title>
      </View>

      <View style={styles.statsContainer}>
        <StatCard
          title="Today's Sales"
          value={`₹${stats?.today_sales?.total || 0}`}
          color="#4caf50"
        />
        <StatCard
          title="Monthly Sales"
          value={`₹${stats?.month_sales?.total || 0}`}
          color="#2196f3"
        />
        <StatCard
          title="Low Stock"
          value={stats?.low_stock_count || 0}
          color="#ff9800"
        />
        <StatCard
          title="Expiring"
          value={stats?.expiring_items_count || 0}
          color="#f44336"
        />
      </View>

      <Card style={styles.recentSalesCard}>
        <Card.Content>
          <Title>Recent Sales</Title>
          {stats?.recent_sales?.length > 0 ? (
            stats.recent_sales.map((sale, index) => (
              <View key={index} style={styles.saleItem}>
                <View>
                  <Paragraph style={styles.invoiceNumber}>
                    {sale.invoice_number}
                  </Paragraph>
                  <Paragraph style={styles.customerName}>
                    {sale.first_name} {sale.last_name}
                  </Paragraph>
                </View>
                <View style={styles.saleAmount}>
                  <Paragraph style={styles.amount}>₹{sale.final_amount}</Paragraph>
                  <Paragraph style={styles.date}>
                    {new Date(sale.sale_date).toLocaleDateString()}
                  </Paragraph>
                </View>
              </View>
            ))
          ) : (
            <Paragraph>No recent sales found</Paragraph>
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#1976d2',
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  statCard: {
    width: '48%',
    margin: '1%',
    padding: 15,
    borderLeftWidth: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
  },
  recentSalesCard: {
    margin: 10,
  },
  saleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  invoiceNumber: {
    fontWeight: 'bold',
  },
  customerName: {
    fontSize: 12,
    color: '#666',
  },
  saleAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    fontWeight: 'bold',
  },
  date: {
    fontSize: 12,
    color: '#666',
  },
});

export default DashboardScreen;
