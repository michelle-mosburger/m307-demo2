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

// Datenbankabfrage event

app.get("/", async function (req, res) {
  const event = await app.locals.pool.query("select * from event");
  console.log(event.rows);
  res.render("start", { event: event.rows });
});

// Datenbankabfrage user

/*app.get("/", async function (req, res) {
  const user = await app.locals.pool.query("select * from user");
  res.render("start", {});
});/*



/*Seite Impressum*/

app.get("/impressum", async function (req, res) {
  res.render("impressum", {});
});

/*Seite Event erstellen*/
/* Formular Event erstellen */
app.get("/form", async function (req, res) {
  res.render("form", {});
});

/*Event-Formular übermitteln*/
app.post("/creat_event", upload.single('image') async function (req, res) {
  await app.locals.pool.query(
    "INSERT INTO event (event_name, description, place, date) VALUES ($1, $2, $3, $4)",
    [req.body.title, req.body.description, req.body.place, req.body.date]
  );
  res.redirect("/");
});

/* Wichtig! Diese Zeilen müssen immer am Schluss der Website stehen! */
app.listen(3010, () => {
  console.log(`Example app listening at http://localhost:3010`);
});
