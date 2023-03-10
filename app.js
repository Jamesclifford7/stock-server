const express = require('express')
const app = express()
const cors = require('cors')
const mysql = require('mysql2');
require('dotenv').config()
const validator = require('email-validator')

app.use(express.json());
app.use(cors()); 

const pool = mysql.createPool({
  host: process.env.CLEARDB_HOST,
  user: process.env.CLEARDB_USER,
  password: process.env.CLEARDB_PASSWORD, 
  database: process.env.CLEARDB_DATABASE, 
  connectionLimit: 10, 
  connectTimeout: 60000, 
});

pool.getConnection((error)=> {
  if (error) {
    console.log('Connection Failed', error.message);
  } else {
    console.log('Connection Established Successfully'); 
  }; 
});

app.get('/', (req, res) => {
  res.send('welcome to the stock analyzer server')
})

// get all users
app.get('/users', async (req, res) => {
  pool.query(`SELECT * FROM ${process.env.CLEARDB_DATABASE}.users;`, (error, result) => {
    if (error) {
      console.log(error)
    }

    res.json(result); 
  })
})



// get user by id
app.get('/users/:id', (req, res) => {
  const id = parseInt(req.params.id)

  pool.query(`SELECT * FROM ${process.env.CLEARDB_DATABASE}.users WHERE id = ${id};`, (error, result) => {
    if (error) {
      console.log(error)
    }
    res.json(result)
  })
})

// handle login
app.post('/login', (req, res) => {
  const {email, password} = req.body

  pool.query(`SELECT * FROM ${process.env.CLEARDB_DATABASE}.users WHERE email = '${email}' AND password = '${password}';`, (error, result) => {
    if (error) {
      console.log(error)
    } else if (result.length === 0) {
      res.send('User not found')
    } else {
      res.json(result)
    }
  })
})

// handle sign up
app.post('/users', (req, res) => {
  const { email, password } = req.body

  if (!(validator.validate(email))) {
    return res
        .status(400)
        .send('Please enter a valid email address')
  }

  if (password.length < 6) {
    return res
        .status(400)
        .send('Password must be at least 6 characters long')       
  }; 

  if (!password.match(/[A-Z]/)) {
      return res
          .status(400)
          .send('Password must include one uppercase letter')
  }; 

  if (!password.match(/\d+/g)) {
      return res  
          .status(400)
          .send('Password must include one number' )
  }; 

  pool.query(`SELECT * FROM ${process.env.CLEARDB_DATABASE}.users WHERE email = '${email}';`, (error, result) => {
    if (error) {
      console.log(error)
    } 
      
    // check to see if an account with this email already exists
    if (result.length !== 0) {
      res.status(409).send(`Account already exists for ${email}`)
    } else {
        // POST request for new user
        pool.query(`INSERT INTO ${process.env.CLEARDB_DATABASE}.users (email, password) VALUES ('${email}', '${password}');`, (error, result) => {
          if (error) {
            console.log(error)
          }

          // if sign up is successful, return new user
          if (result.affectedRows === 1) {
            pool.query(`SELECT * FROM ${process.env.CLEARDB_DATABASE}.users WHERE email = '${email}' AND password = '${password}';`, (error, result) => {
              if (error) {
                console.log(error)
              } else {
                res.status(201).json(result)
              }
            })
          }
        })
    }
  })
})

// get a user's portfolio
app.get('/stocks/:userid', (req, res) => {
  const id = parseInt(req.params.userid)

  pool.query(`SELECT * FROM ${process.env.CLEARDB_DATABASE}.stocks WHERE user_id = '${id}';`, (error, result) => {
    if (error) {
      console.log(error)
    }

    res.json(result)
  })
})

// add a stock to user's portfolio
app.post('/stocks/:userid', (req, res) => {
  const id = parseInt(req.params.userid)
  const { stock } = req.body

  pool.query(`INSERT INTO ${process.env.CLEARDB_DATABASE}.stocks (user_id, stock_name) VALUES ('${id}', '${stock}');`, (error, result) => {
    if (error) {
      console.log(error)
    }
    

    if (result.affectedRows === 1) {
      pool.query(`SELECT * FROM ${process.env.CLEARDB_DATABASE}.stocks WHERE (id = LAST_INSERT_ID())`, (error, result) => {
        if (error) {
          console.log(error)
        }

        res.json(result[0])
      })
    }
  })
})

// remove stock from user's portfolio
app.delete('/stocks/:stockid', (req, res) => {
  const id = parseInt(req.params.stockid)

  pool.query(`DELETE FROM ${process.env.CLEARDB_DATABASE}.stocks WHERE (id = ${id});`, (error, result) => {
    if (error) {
      console.log(error)
    }

    if (result.affectedRows === 1) {
      res.send('Stock successfully removed from portfolio')
    }
  })
})

// delete user account
app.delete('/users/:id', (req, res) => {
  const id = parseInt(req.params.id)

  pool.query(`DELETE FROM ${process.env.CLEARDB_DATABASE}.users WHERE (id = ${id});`, (error, result) => {
    if (error) {
      console.log(error)
    }

    if (result.affectedRows === 1) {
      res.send('Account successfully deleted')
    }
  })
})

app.listen(process.env.PORT || 8080, '0.0.0.0',  () => {
  console.log(`listening on port ${process.env.PORT}`)
})