const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const jsonwebtoken = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const dbPath = path.join(__dirname, "twitterClone.db");
const app = express();

app.use(express.json());

let db = "";

const initializeDatabaseAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3001, () => {
      console.log("Server running Successfully at http://localhost:3001/");
    });
  } catch (e) {
    console.log(`DB Error ${e.message}`);
    process.exit(1);
  }
};

initializeDatabaseAndServer();

const convertDataBaseObject = (dbObject) => {
  return {
    username: dbObject.username,
    password: dbObject.password,
  };
};

//API 1 register
app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const fetchUserExistenceQuery = `SELECT * FROM user WHERE username='${username}';`;
  const registerDetails = await db.get(fetchUserExistenceQuery);
  if (registerDetails === undefined) {
    if (password.length > 5) {
      const hashingPassword = await bcrypt.hash(password, 10);
      const userRegistration = `INSERT INTO user (username, password, name, gender)
          VALUES ('${username}',
          '${hashingPassword}',
          '${name}',
          '${gender}');`;
      await db.run(userRegistration);

      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//API 2

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const fetchUserExistence = `SELECT * FROM user WHERE username='${username}';`;
  const responseUserDetails = await db.get(fetchUserExistence);

  if (responseUserDetails === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const LoginUserDetails = convertDataBaseObject(responseUserDetails);
    console.log(LoginUserDetails);
    const isPasswordMatched = await bcrypt.compare(
      password,
      LoginUserDetails.password
    );
    if (isPasswordMatched === true) {
      const payload = LoginUserDetails.username;
      const jwtToken = jsonwebtoken.sign(payload, "MY_SECRET_KEY");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

module.exports = app;
