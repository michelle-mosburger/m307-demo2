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
  try {
    const result = await app.locals.pool.query(
      "SELECT id, event_name, description, place, date, COALESCE(image, '/placeholder.png') AS image FROM event"
    );
    res.render("start", { events: result.rows, session: req.session }); // session an Template übergeben
  } catch (error) {
    console.error("Fehler beim Laden der Events:", error);
    res.status(500).send("Fehler beim Laden der Events.");
  }
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
  }

  // Event-Daten aus dem Formular
  const { title, description, place, date } = req.body;
  const user_id = req.session.userid; // Benutzer-ID aus der Session holen
  // Überprüfen, ob ein Bild hochgeladen wurde
  const image = req.file ? `/uploads/${req.file.filename}` : "/placeholder.png"; // Standardbild, wenn kein Bild hochgeladen wurde

  console.log({ user_id, title, description, place, date, image }); // Debugging

  // Event in die Datenbank einfügen und mit der Benutzer-ID verknüpfen
  try {
    // Beachte die korrekte Reihenfolge der Spalten und Parameter
    await app.locals.pool.query(
      "INSERT INTO event (user_id, event_name, description, place, date, image) VALUES ($1, $2, $3, $4, $5, $6)",
      [user_id, title, description, place, date, image] // Hier wird 'user_id' hinzugefügt
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
