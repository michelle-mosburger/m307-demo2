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
  pool.query("SELECT NOW()", (err, res) => {
    if (err) {
      console.error("Datenbankverbindung fehlgeschlagen:", err);
    } else {
      console.log("Datenbankverbindung erfolgreich:", res.rows);
    }
  });

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

  app.use((req, res, next) => {
    // Setze die Session-Daten als globale Variablen für Handlebars
    res.locals.session = req.session;
    next();
  });

  app.locals.pool = pool;

  // Route für Registrierung
  app.get("/register", function (req, res) {
    res.render("register");
  });

  app.post("/register", function (req, res) {
    const { first_name, last_name, username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10); // Passwort hashen

    pool.query(
      "INSERT INTO users (first_name, last_name, username, password) VALUES ($1, $2, $3, $4)",
      [first_name, last_name, username, hashedPassword],
      (error, result) => {
        if (error) {
          console.log(error);
          return res.render("register", {
            error:
              "Registration fehlgeschlagen. Bitte versuchen Sie es später erneut.",
          });
        }
        res.redirect("/login");
      }
    );
  });

  // Route für Login
  app.get("/login", function (req, res) {
    res.render("login");
  });

  app.post("/login", function (req, res) {
    const { username, password } = req.body;

    pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username],
      (error, result) => {
        if (error) {
          console.log(error);
          return res.redirect("/login");
        }

        if (result.rows.length === 0) {
          console.log("Benutzer nicht gefunden");
          return res.redirect("/login");
        }

        if (bcrypt.compareSync(password, result.rows[0].password)) {
          req.session.userid = result.rows[0].id; // Benutzer-ID in der Session speichern
          res.redirect("/"); // Weiterleitung zur Startseite
        } else {
          console.log("Falsches Passwort");
          res.redirect("/login");
        }
      }
    );
  });

  // Favoriten anzeigen
  app.get("/favorites", async (req, res) => {
    if (!req.session.userid) {
      return res.redirect("/login");
    }

    try {
      const result = await app.locals.pool.query(
        `
      SELECT e.id, e.event_name, e.description, e.place, e.date, 
      COALESCE(e.image, '/placeholder.png') AS image
      FROM event e
      INNER JOIN favorit f ON e.id = f.event_id
      WHERE f.users_id = $1
      `,
        [req.session.userid]
      );

      res.render("favorites", { favorites: result.rows });
    } catch (error) {
      console.error("Fehler beim Abrufen der Favoriten:", error.message);
      res.status(500).send("Fehler beim Abrufen der Favoriten.");
    }
  });

  // Event favorisieren
  app.post("/like/:id", async (req, res) => {
    if (!req.session.userid) {
      return res.redirect("/login");
    }

    const eventId = req.params.id;

    try {
      // Überprüfen, ob das Event bereits favorisiert wurde
      const checkResult = await app.locals.pool.query(
        "SELECT * FROM favorit WHERE event_id = $1 AND users_id = $2",
        [eventId, req.session.userid]
      );

      if (checkResult.rows.length === 0) {
        // Favorisieren, wenn es nicht existiert
        await app.locals.pool.query(
          "INSERT INTO favorit (event_id, users_id) VALUES ($1, $2)",
          [eventId, req.session.userid]
        );
      }

      res.redirect("/");
    } catch (error) {
      console.error("Fehler beim Favorisieren des Events:", error.message);
      res.status(500).send("Fehler beim Favorisieren des Events.");
    }
  });

  // Event von Favoriten entfernen
  app.post("/unlike/:id", async (req, res) => {
    if (!req.session.userid) {
      return res.redirect("/login");
    }

    const eventId = req.params.id;

    try {
      await app.locals.pool.query(
        "DELETE FROM favorit WHERE event_id = $1 AND users_id = $2",
        [eventId, req.session.userid]
      );

      res.redirect("/favorites");
    } catch (error) {
      console.error("Fehler beim Entfernen des Favoriten:", error.message);
      res.status(500).send("Fehler beim Entfernen des Favoriten.");
    }
  });
  // Route für Profilseite
  app.get("/profile", async (req, res) => {
    if (!req.session.userid) {
      return res.redirect("/login");
    }

    try {
      const result = await app.locals.pool.query(
        "SELECT first_name, last_name, username FROM users WHERE id = $1",
        [req.session.userid]
      );

      if (result.rows.length === 0) {
        return res.status(404).send("Benutzer nicht gefunden");
      }

      const user = result.rows[0];
      res.render("profile", { user });
    } catch (error) {
      console.error("Fehler beim Abrufen der Benutzerdaten:", error);
      res.status(500).send("Fehler beim Abrufen der Benutzerdaten.");
    }
  });

  // Route zum Aktualisieren des Profils
  app.post("/profile/update", async (req, res) => {
    if (!req.session.userid) {
      return res.redirect("/login");
    }

    const { first_name, last_name, username } = req.body;

    try {
      await app.locals.pool.query(
        "UPDATE users SET first_name = $1, last_name = $2, username = $3 WHERE id = $4",
        [first_name, last_name, username, req.session.userid]
      );

      res.redirect("/profile");
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Benutzerdaten:", error);
      res.status(500).send("Fehler beim Aktualisieren der Benutzerdaten.");
    }
  });

  // Route für Logout
  app.get("/logout", function (req, res) {
    req.session.destroy((err) => {
      if (err) {
        return res.redirect("/"); // Fehlerbehandlung
      }
      res.redirect("/"); // Nach dem Logout zurück zur Startseite
    });
  });

  return app;
}

export { upload };
