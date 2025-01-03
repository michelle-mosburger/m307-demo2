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
      secret: "thisismysecrctekeyfhrgfgrfrty84fwir767", // Schlüssel, um Sitzungsdaten sicher zu verschlüsseln
      saveUninitialized: true, // Speichert auch nicht initialisierte Sitzungen
      cookie: { maxAge: 86400000, secure: false }, // Sitzungs-Cookie mit einer Dauer von 24 Stunden.
      resave: false, // Verhindert das erneute Speichern unveränderter Sitzungen.
    })
  );

  app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
  });

  app.locals.pool = pool;

  // Route für die Registrierungsseite.
  app.get("/register", function (req, res) {
    res.render("register"); // Rendert das Template für die Registrierung.
  });

  // Route zur Verarbeitung der Registrierung.
  app.post("/register", function (req, res) {
    const { first_name, last_name, username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

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

        // Vergleicht das eingegebene Passwort mit dem in der Datenbank gespeicherten gehashten Passwort
        if (bcrypt.compareSync(password, result.rows[0].password)) {
          req.session.userid = result.rows[0].id; // Speichert die Benutzer-ID in der Sitzung.
          res.redirect("/");
        } else {
          console.log("Falsches Passwort");
          res.redirect("/login");
        }
      }
    );
  });

  app.get("/favorites", async (req, res) => {
    if (!req.session.userid) {
      return res.redirect("/login");
    }

    try {
      // Abfrage der Events, die der Benutzer als Favoriten markiert hat.
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

  // Route zum Hinzufügen eines Events zu den Favoriten.
  app.post("/like/:id", async (req, res) => {
    if (!req.session.userid) {
      return res.redirect("/login");
    }

    const eventId = req.params.id;

    try {
      // Prüft, ob das Event bereits in den Favoriten gespeichert ist.
      const checkResult = await app.locals.pool.query(
        "SELECT * FROM favorit WHERE event_id = $1 AND users_id = $2",
        [eventId, req.session.userid]
      );

      if (checkResult.rows.length === 0) {
        // Fügt das Event zu den Favoriten hinzu, wenn es noch nicht existiert.
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

      const referer = req.get("Referer"); // Ursprungsseite abrufen
      res.redirect(referer || "/"); // Zurück zur Ursprungsseite oder zur Startseite
    } catch (error) {
      console.error("Fehler beim Entfernen des Favoriten:", error.message);
      res.status(500).send("Fehler beim Entfernen des Favoriten.");
    }
  });

  // Route zum Abrufen des Benutzerprofils
  app.get("/profile", async (req, res) => {
    if (!req.session.userid) {
      return res.redirect("/login");
    }

    try {
      // Datenbankabfrage, um Benutzerdaten basierend auf der Benutzer-ID abzurufen
      const result = await app.locals.pool.query(
        "SELECT first_name, last_name, username FROM users WHERE id = $1",
        [req.session.userid]
      );

      // Überprüfen, ob der Benutzer existiert
      if (result.rows.length === 0) {
        return res.status(404).send("Benutzer nicht gefunden");
      }

      const user = result.rows[0]; // Die Benutzerinformationen aus der Datenbank
      res.render("profile", { user });
    } catch (error) {
      console.error("Fehler beim Abrufen der Benutzerdaten:", error);
      res.status(500).send("Fehler beim Abrufen der Benutzerdaten.");
    }
  });

  // Route zum Aktualisieren des Benutzerprofils
  app.post("/profile/update", async (req, res) => {
    if (!req.session.userid) {
      return res.redirect("/login");
    }

    const { first_name, last_name, username } = req.body; // Neue Benutzerdaten aus der Anfrage

    try {
      // Datenbankabfrage, um die Benutzerdaten zu aktualisieren
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

  // Route zum Logout des Benutzers
  app.get("/logout", function (req, res) {
    // Hiermit wird der Benutzer ausgeloggt
    req.session.destroy((err) => {
      if (err) {
        return res.redirect("/");
      }
      res.redirect("/");
    });
  });

  app.get("/my-events", async (req, res) => {
    if (!req.session.userid) {
      return res.redirect("/login");
    }

    try {
      const userId = req.session.userid;

      const result = await app.locals.pool.query(
        `
      SELECT id, event_name, description, place, 
             TO_CHAR(date, 'DD MM YYYY') AS formatted_date, 
             COALESCE(image, '/placeholder.png') AS image
      FROM event
      WHERE user_id = $1
      ORDER BY date DESC
      `,
        [userId]
      );

      res.render("my-events", { events: result.rows, session: req.session });
    } catch (error) {
      console.error("Fehler beim Abrufen der eigenen Events:", error);
      res.status(500).send("Fehler beim Abrufen der eigenen Events.");
    }
  });

  // Route zum Löschen eines Events
  app.post("/delete-event/:id", async (req, res) => {
    if (!req.session.userid) {
      return res.redirect("/login");
    }

    const eventId = req.params.id;

    try {
      // Datenbankabfrage, um zu prüfen, ob der Benutzer das Event erstellt hat bzw. der "Eigentümer" des Events ist
      const checkOwner = await app.locals.pool.query(
        "SELECT user_id FROM event WHERE id = $1",
        [eventId]
      );

      // Überprüfen, ob das Event existiert und ob der Benutzer der Eigentümer ist
      if (
        checkOwner.rows.length === 0 ||
        checkOwner.rows[0].user_id !== req.session.userid
      ) {
        return res
          .status(403)
          .send("Nicht autorisiert, dieses Event zu löschen.");
      }

      await app.locals.pool.query("DELETE FROM event WHERE id = $1", [eventId]);

      res.redirect("/my-events");
    } catch (error) {
      console.error("Fehler beim Löschen des Events:", error);
      res.status(500).send("Fehler beim Löschen des Events.");
    }
  });

  return app;
}

export { upload };
