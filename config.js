import express from "express";
import { engine } from "express-handlebars";
import pg from "pg";
const { Pool } = pg;
import cookieParser from "cookie-parser";
import multer from "multer";
const upload = multer({ dest: "public/uploads/" });
import sessions from "express-session";
import bcrypt from "bcrypt";

export function createApp(dbconfig) {
  const app = express();

  const pool = new Pool(dbconfig);

  app.engine("handlebars", engine());
  app.set("view engine", "handlebars");
  app.set("views", "./views");

  app.use(express.static("public"));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use(
    sessions({
      secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
      saveUninitialized: true,
      cookie: { maxAge: 86400000, secure: false },
      resave: false,
    })
  );

  app.locals.pool = pool;
  app.get("/register", function (req, res) {
    res.render("register");
  });

  app.post("/register", function (req, res) {
    var password = bcrypt.hashSync(req.body.password, 10);
    pool.query(
      "INSERT INTO users (first_name, last_name, username, password) VALUES ($1, $2, $3, $4)",
      [req.body.first_name, req.body.last_name, req.body.username, password],
      (error, result) => {
        if (error) {
          console.log(error);
          return res.render("register", {
            error: "Registration failed. Please try again.",
          });
        }
        res.redirect("/login");
      }
    );
  });

  app.get("/login", function (req, res) {
    res.render("login");
  });

  app.post("/login", function (req, res) {
    pool.query(
      "SELECT * FROM users WHERE username = $1",
      [req.body.username],
      (error, result) => {
        if (error) {
          console.log(error);
          return res.redirect("/login"); // Fehlerbehandlung
        }

        if (result.rows.length === 0) {
          console.log("Benutzer nicht gefunden");
          return res.redirect("/login");
        }
        if (bcrypt.compareSync(req.body.password, result.rows[0].password)) {
          req.session.userid = result.rows[0].id;
          res.redirect("/");
        } else {
          console.log("Falsches Passwort");
          res.redirect("/login");
        }
      }
    );
  });

  app.post("/like/:id", async function (req, res) {
    if (!req.session.userid) {
      res.redirect("/login");
      return;
    }
    await app.locals.pool.query(
      "INSERT INTO favorit (event_id, users_id) VALUES ($1, $2)",
      [req.params.id, req.session.userid]
    );
    res.redirect("/");
  });

  app.get("/favorites", async function (req, res) {
    if (!req.session.userid) {
      return res.redirect("/login");
    }

    try {
      const result = await app.locals.pool.query(
        `
        SELECT events.* 
        FROM events
        INNER JOIN favorit ON events.id = favorit.event_id
        WHERE favorit.users_id = $1
        `,
        [req.session.userid]
      );

      res.render("favorites", { favorites: result.rows });
    } catch (error) {
      console.error("Fehler beim Abrufen der Favoriten:", error);
      res
        .status(500)
        .send(
          "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut."
        );
    }
  });

  return app;
}

export { upload };
