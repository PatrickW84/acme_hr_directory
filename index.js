const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const pg = require("pg");
const client = new pg.Client(
  process.env.DATABASE_URL ||
    `postgres://allen:1234@localhost/theAcmeHRDirectory`
);
app.use(express.json()); // converts POST, etc. to JSON data
app.use(require("morgan")("dev")); // log requests

app.get("/api/employees", async (req, res, next) => {
  try {
    const SQL = `
            SELECT * from employees`;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/departments", async (req, res, next) => {
  try {
    const SQL = `
              SELECT * from departments ORDER BY created_at DESC;`;
    const response = await client.query(SQL);
    res.send(response.rows);
  } catch (ex) {
    next(ex);
  }
});

app.post("/api/employees", async (req, res, next) => {
  try {
    const SQL = `
        INSERT INTO employees(name, department_id)
        VALUES($1, $2)
        RETURNING *
        `;
    const response = await client.query(SQL, [
      req.body.name,
      req.body.department_id,
    ]);
    res.send(response.rows[0]);
  } catch (ex) {
    next(ex);
  }
});

app.delete("/api/employees/:id", async (req, res, next) => {
  try {
    const SQL = `
            DELETE from employees
            WHERE id = $1
        `;
    const response = await client.query(SQL, [req.params.id]);
    res.sendStatus(204);
  } catch (ex) {
    next(ex);
  }
});

app.put("/api/employees/:id", async (req, res, next) => {
  try {
    const SQL = `
        UPDATE employees
        SET name=$1, department_id=$2, updated_at= now() 
        WHERE id=$3 RETURNING *
        `;
    const response = await client.query(SQL, [
      req.body.name,
      req.body.department_id,
      req.params.id,
    ]);
    res.send(response.rows[0]);
  } catch (ex) {
    next(ex);
  }
});

const init = async () => {
  await client.connect();
  let SQL = `
  DROP TABLE IF EXISTS departments CASCADE;
  DROP TABLE IF EXISTS employees CASCADE;
  CREATE TABLE departments(
    id SERIAL PRIMARY KEY,
    name VARCHAR(100)
    );
  CREATE TABLE employees(
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    name VARCHAR(255) NOT NULL,
    department_id INTEGER REFERENCES departments(id) NOT NULL
    );
    `;

  await client.query(SQL);
  console.log("Tables created");

  // seed tables with employees
  SQL = `
    INSERT INTO DEPARTMENTS(name) VALUES('Accounting');
    INSERT INTO DEPARTMENTS(name) VALUES('Sales');
    INSERT INTO DEPARTMENTS(name) VALUES('CustomerService');
    INSERT INTO employees(name, department_id) VALUES('Kelly', 1); 
    INSERT INTO employees(name, department_id) VALUES('Stanley', 2); 
    INSERT INTO employees(name, department_id) VALUES('Jim', 2); 
    INSERT INTO employees(name, department_id) VALUES('Dwight', 2); 
    INSERT INTO employees(name, department_id) VALUES('Oscar', 3);
     `;

  await client.query(SQL);
  console.log("data seeded");
  app.listen(port, () => console.log(`Listening on port ${port}`));
};

init();

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});
