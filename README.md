# Inventory and Data Management System

Web Dev III - Lab Assignment 3

REST API for managing products of a store / warehouse using Node.js, Express, MongoDB and Mongoose.
(uses `import` / `export` syntax and nodemon for development)

## How to run

1. `npm install`
2. Start MongoDB (or use an Atlas link)
3. Make a `.env` file like `.env.example`
   ```
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/inventory_db
   ```
4. Add the sample data from `products.json` (see below)
5. `npm run dev` (nodemon) or `npm start`

## Adding the sample data

`products.json` has 12 sample products. Any one of these ways can be used.

**1. Mongo shell (mongosh)** - open a terminal in the project folder

```
mongosh inventory_db
```

then paste this

```js
const fs = require('fs');
const products = JSON.parse(fs.readFileSync('products.json', 'utf8'));
products.forEach((p) => { p.createdAt = new Date(); p.updatedAt = new Date(); });
db.products.insertMany(products);
```

Check with `db.products.countDocuments()` (should be 12).
To remove all the products and start again: `db.products.deleteMany({})`

**2. mongoimport** (comes with MongoDB Database Tools) - run in a normal terminal, not inside mongosh

```
mongoimport --db inventory_db --collection products --file products.json --jsonArray
```

**3. Postman** - the POST api takes one product at a time, so send the products one by one

- Method: POST, URL: `http://localhost:5000/api/products`
- Body -> raw -> JSON, paste one object from `products.json`
- Server must be running, and you should get `201 Created`

## Folders

- `database` - database connection (db.js)
- `models` - Product schema
- `controllers` - logic of every route
- `routes` - routes
- `middleware` - validation and error handler
- `utils` - custom error class

## Product schema

- name (required, 2-100 chars)
- sku (required, unique, like `FURN-TB-812`)
- category (required: Electronics, Apparel, Furniture, Stationery, Grocery, Books, Other)
- price (required, >= 0)
- quantity (whole number, >= 0, default 0)
- reorderLevel (whole number, >= 0, default 10)
- supplier (optional)
- stockValue = price x quantity (virtual field, not saved in db)

## APIs

| Method | URL | Work |
|--------|-----|------|
| POST | /api/products | create product |
| GET | /api/products | all products with filter, sort, pagination |
| GET | /api/products/:id | single product |
| PUT | /api/products/:id | update product |
| PATCH | /api/products/:id/stock | restock / sale, body `{ "change": 10 }` |
| DELETE | /api/products/:id | delete product |
| GET | /api/products/low-stock | quantity <= reorderLevel |
| GET | /api/products/summary | category wise summary |

Query params for `GET /api/products`:
`category`, `supplier`, `search`, `minPrice`, `maxPrice`, `inStock`, `sort` (like `-price,name`), `page`, `limit`

Example: `/api/products?category=Furniture&sort=-price&page=1&limit=5`

## Errors

All errors are handled in `middleware/errorHandler.js`.
400 - validation error / invalid id / not enough stock, 404 - not found, 409 - duplicate sku, 500 - server error
