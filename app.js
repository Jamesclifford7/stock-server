const express = require('express')
const app = express()
const port = 3000
const cors = require('cors')
const mysql = require('mysql2');
require('dotenv').config();
const validator = require('email-validator')
const PORT = process.env.PORT || 8000

app.use(express.json());
app.use(cors())

const mysqlConnection = mysql.createPool({
  host: process.env.AWS_HOST,
  user: process.env.AWS_USER,
  password: process.env.MYSQL_PASSWORD, 
  database: process.env.AWS_DATABASE, 
  connectionLimit: 10, 
});

mysqlConnection.getConnection((error)=> {
  if (error) {
    console.log('Connection Failed', error);
  } else {
    console.log('Connection Established Successfully')
  }
});

// get all users
app.get('/users', (req, res) => {
  mysqlConnection.query(`SELECT * FROM stock_database.users;`, (error, result, fields) => {
    if (error) {
      console.log(error)
    }
    
    res.json(result)
  })
})

// get user by id
app.get('/users/:id', (req, res) => {
  const id = parseInt(req.params.id)

  mysqlConnection.query(`SELECT * FROM stock_database.users WHERE id = ${id};`, (error, result, fields) => {
    if (error) {
      console.log(error)
    }
    res.json(result)
  })
})

// handle login
app.post('/login', (req, res) => {
  const {email, password} = req.body

  mysqlConnection.query(`SELECT * FROM stock_database.users WHERE email = '${email}' AND password = '${password}';`, (error, result, fields) => {
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

  mysqlConnection.query(`SELECT * FROM stock_database.users WHERE email = '${email}';`, (error, result, fields) => {
    if (error) {
      console.log(error)
    } 
      
    // check to see if an account with this email already exists
    if (result.length !== 0) {
      res.status(409).send(`Account already exists for ${email}`)
    } else {
        // POST request for new user
        mysqlConnection.query(`INSERT INTO stock_database.users (email, password) VALUES ('${email}', '${password}');`, (error, result, fields) => {
          if (error) {
            console.log(error)
          }

          // if sign up is successful, return new user
          if (result.affectedRows === 1) {
            mysqlConnection.query(`SELECT * FROM stock_database.users WHERE email = '${email}' AND password = '${password}';`, (error, result, fields) => {
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

  mysqlConnection.query(`SELECT * FROM stock_database.stocks WHERE user_id = '${id}';`, (error, result, fields) => {
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

  mysqlConnection.query(`INSERT INTO stock_database.stocks (user_id, stock_name) VALUES ('${id}', '${stock}');`, (error, result, fields) => {
    if (error) {
      console.log(error)
    }
    

    if (result.affectedRows === 1) {
      mysqlConnection.query('SELECT * FROM stock_database.stocks WHERE (id = LAST_INSERT_ID())', (error, result, fields) => {
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

  mysqlConnection.query(`DELETE FROM stock_database.stocks WHERE (id = ${id});`, (error, result, fields) => {
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

  mysqlConnection.query(`DELETE FROM stock_database.users WHERE (id = ${id});`, (error, result, fields) => {
    if (error) {
      console.log(error)
    }

    if (result.affectedRows === 1) {
      res.send('Account successfully deleted')
    }
  })
})

app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`)
})