import { createApp, upload } from "./config.js";

const app = createApp({
  user: "funny_monkey_1284",
  host: "bbz.cloud",
  database: "funny_monkey_1284",
  password: "1237ed3614d24ef81c834e37c3748123",
  port: 30211,
});

/* Startseite */
app.get("/", async (req, res) => {
  try {
    const userId = req.session.userid || null;

    const result = await app.locals.pool.query(
      `
      SELECT e.id, e.event_name, e.description, e.place, e.date, 
             COALESCE(e.image, '/placeholder.png') AS image,
             CASE 
               WHEN f.event_id IS NOT NULL THEN TRUE 
               ELSE FALSE 
             END AS is_favorite
      FROM event e
      LEFT JOIN favorit f ON e.id = f.event_id AND f.users_id = $1
      `,
      [userId]
    );

    res.render("start", { events: result.rows, session: req.session });
  } catch (error) {
    console.error("Fehler beim Laden der Events:", error);
    res.status(500).send("Fehler beim Laden der Events.");
  }
});

// Impressum-Seite
app.get("/impressum", async function (req, res) {
  res.render("impressum", {});
});

// Formular-Seite für Event-Erstellung
app.get("/form", async function (req, res) {
  if (!req.session.userid) {
    return res.redirect("/login"); // Sicherstellen, dass der Benutzer eingeloggt ist
  }
  res.render("form", {});
});

// Event erstellen - Formular übermitteln
app.post("/creat_event", upload.single("image"), async function (req, res) {
  // Sicherstellen, dass der Benutzer eingeloggt ist
  if (!req.session.userid) {
    return res.redirect("/login"); // Wenn nicht eingeloggt, zur Login-Seite weiterleiten
  }

  const { title, description, place, date } = req.body;
  const user_id = req.session.userid; // Benutzer-ID aus der Session holen
  const image = req.file ? `/uploads/${req.file.filename}` : "/placeholder.png"; // Standardbild, wenn kein Bild hochgeladen wurde

  console.log({ user_id, title, description, place, date, image }); // Debugging

  try {
    // Event in die Datenbank einfügen und mit der Benutzer-ID verknüpfen
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

// Server starten
app.listen(3010, () => {
  console.log(`Example app listening at http://localhost:3010`);
});
