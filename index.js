import { createApp, upload } from "./config.js";

const app = createApp({
  user: "funny_monkey_1284",
  host: "bbz.cloud",
  database: "funny_monkey_1284",
  password: "1237ed3614d24ef81c834e37c3748123",
  port: 30211,
});

app.get("/", async (req, res) => {
  try {
    const userId = req.session.userid || null;

    const result = await app.locals.pool.query(
      `
      SELECT e.id, e.event_name, e.description, e.place, e.date, 
      TO_CHAR(e.date, 'DD MM YYYY') AS formatted_date, 
             COALESCE(e.image, '/placeholder.png') AS image,
             CASE 
               WHEN f.event_id IS NOT NULL THEN TRUE 
               ELSE FALSE 
             END AS is_favorite
      FROM event e
      LEFT JOIN favorit f ON e.id = f.event_id AND f.users_id = $1
      ORDER BY e.date DESC
      `,
      [userId]
    );

    res.render("start", { events: result.rows, session: req.session });
  } catch (error) {
    console.error("Fehler beim Laden der Events:", error);
    res.status(500).send("Fehler beim Laden der Events.");
  }
});

app.get("/impressum", async function (req, res) {
  res.render("impressum", {});
});

app.get("/form", async function (req, res) {
  if (!req.session.userid) {
    return res.redirect("/login");
  }
  res.render("form", {});
});

app.post("/creat_event", upload.single("image"), async function (req, res) {
  if (!req.session.userid) {
    return res.redirect("/login");
  }

  const { title, description, place, date } = req.body;
  const user_id = req.session.userid;
  const image = req.file ? `/uploads/${req.file.filename}` : "/placeholder.png";

  console.log({ user_id, title, description, place, date, image });

  try {
    await app.locals.pool.query(
      "INSERT INTO event (user_id, event_name, description, place, date, image) VALUES ($1, $2, $3, $4, $5, $6)",
      [user_id, title, description, place, date, image]
    );
    res.redirect("/");
  } catch (error) {
    console.error("Fehler beim Erstellen des Events:", error);
    res.status(500).send("Fehler beim Erstellen des Events.");
  }
});

app.listen(3010, () => {
  console.log(`Example app listening at http://localhost:3010`);
});
