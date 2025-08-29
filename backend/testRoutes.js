// const path = require('path');

// const routesToTest = [
//   './src/routes/auth',
//   './src/routes/users',
//   './src/routes/branches',
//   './src/routes/products',
//   './src/routes/inventory',
//   './src/routes/sales',
//   './src/routes/purchases',
//   './src/routes/customers',
//   './src/routes/suppliers',
//   './src/routes/reports',
//   './src/routes/dashboard'
// ];

// routesToTest.forEach(routePath => {
//   try {
//     const resolvedPath = path.resolve(__dirname, routePath);
//     const route = require(resolvedPath);
//     console.log(`✅ ${routePath} →`, typeof route === 'function' ? 'Valid Router' : `Invalid: ${typeof route}`);
//   } catch (error) {
//     console.error(`❌ ${routePath} → Failed to load: ${error.message}`);
//   }
// });
