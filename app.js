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
    userId: dbObject.user_id,
    name: dbObject.name,
    username: dbObject.username,
    password: dbObject.password,
  };
};

//Authentication

const Authentication = (request, response, next) => {
  const { tweetId } = request.params;
  const { tweet } = request.body;

  let JWTToken = "";

  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    JWTToken = authHeader.split(" ")[1];
  }
  if (JWTToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jsonwebtoken.verify(JWTToken, "MY_SECRET_KEY", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.tweetId = tweetId;
        request.tweet = tweet;

        next();
      }
    });
  }
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
    const payload = LoginUserDetails;

    const isPasswordMatched = await bcrypt.compare(
      password,
      LoginUserDetails.password
    );
    if (isPasswordMatched === true) {
      const dbUser = LoginUserDetails.username;
      const jwtToken = jsonwebtoken.sign(dbUser, "MY_SECRET_KEY");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//API 3

app.get("/user/tweets/feed/", Authentication, async (request, response) => {
  const tweetsQuery = `
SELECT
 username, tweet , tweet.date_time AS dateTime
FROM
follower
INNER JOIN tweet
ON follower.following_user_id = tweet.user_id
INNER JOIN user
ON tweet.user_id = user.user_id
WHERE
follower.follower_user_id = ${user_id}
ORDER BY
tweet.date_time DESC
LIMIT 4;`;

  const tweetFeedArray = await db.all(tweetsQuery);
  response.send(tweetFeedArray);
});

module.exports = app;
