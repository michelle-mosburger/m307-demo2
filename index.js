import { createApp, upload } from "./config.js";

const app = createApp({
  user: "funny_monkey_1284",
  host: "bbz.cloud",
  database: "funny_monkey_1284",
  password: "1237ed3614d24ef81c834e37c3748123",
  port: 30211,
});

/* Startseite */
/*app.get("/", async function (req, res) {
  res.render("start", {});
});*/

//Homeseite

app.get("/", async (req, res) => {
  const event = await app.locals.pool.query("select * from event");
  res.render("start", { event: event.rows });
});
// Datenbankabfrage user

/*app.get("/", async function (req, res) {
  const user = await app.locals.pool.query("select * from user");
  res.render("start", {});
});*/

///*Seite Impressum*/

app.get("/impressum", async function (req, res) {
  res.render("impressum", {});
});

/*Seite Event erstellen*/
/* Formular Event erstellen */
app.get("/form", async function (req, res) {
  res.render("form", {});
});

// Event-Formular übermitteln
app.post("/creat_event", upload.single("image"), async function (req, res) {
  // Sicherstellen, dass der Benutzer eingeloggt ist
  if (!req.session.userid) {
    return res.redirect("/login");
    console.log(fehler);
    // Weiterleitung, wenn der Benutzer nicht eingeloggt ist
  }

  // Event-Daten aus dem Formular
  const { title, description, place, date } = req.body;
  const user_id = req.session.userid; // Benutzer-ID aus der Session holen

  // Event in die Datenbank einfügen und mit der Benutzer-ID verknüpfen
  try {
    // Beachte die korrekte Reihenfolge der Spalten und Parameter
    await app.locals.pool.query(
      "INSERT INTO event (user_id, event_name, description, place, date) VALUES ($1, $2, $3, $4, $5)",
      [user_id, title, description, place, date] // Hier wird 'user_id' hinzugefügt
    );
    res.redirect("/"); // Weiterleitung zur Startseite nach dem Erstellen des Events
  } catch (error) {
    console.error("Fehler beim Erstellen des Events:", error);
    res.status(500).send("Fehler beim Erstellen des Events.");
  }
});

// Wichtig! Diese Zeilen müssen immer am Schluss der Website stehen!
app.listen(3010, () => {
  console.log(`Example app listening at http://localhost:3010`);
});
