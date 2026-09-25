const express=require("express");
const session=require("express-session");
const bcrypt=require("bcryptjs");
const Database=require("better-sqlite3");
const path=require("path");

const app=express();
const db=new Database(process.env.DB_FILE||"grolink.db");
db.pragma("journal_mode=WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 email TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 country TEXT DEFAULT '',
 bio TEXT DEFAULT '',
 goals TEXT DEFAULT '[]',
 habits TEXT DEFAULT '[]',
 interests TEXT DEFAULT '[]',
 prefs TEXT DEFAULT '[]',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS connections(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 other_id INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(user_id,other_id)
);
CREATE TABLE IF NOT EXISTS messages(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 sender_id INTEGER NOT NULL,
 receiver_id INTEGER NOT NULL,
 text TEXT NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS experiences(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 title TEXT NOT NULL,
 body TEXT NOT NULL,
 category TEXT DEFAULT 'Personal Growth',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS communities(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT UNIQUE NOT NULL,
 description TEXT DEFAULT '',
 members INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS community_members(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 community_id INTEGER NOT NULL,
 user_id INTEGER NOT NULL,
 UNIQUE(community_id,user_id)
);
`);
const communities=[
["Entrepreneurs Worldwide","Business owners and people building something meaningful."],
["AI Learners","Learn practical AI together."],
["Personal Growth","Habits, discipline, confidence and life lessons."],
["Travel & Culture","Discover people and cultures around the world."],
["Language Exchange","Practice languages with people from different countries."],
["Study Abroad","Experiences, applications and life overseas."]
];
for(const [n,d] of communities) db.prepare("INSERT OR IGNORE INTO communities(name,description) VALUES(?,?)").run(n,d);

app.use(express.json({limit:"1mb"}));
app.use(express.urlencoded({extended:true}));
app.use(session({
 secret:process.env.SESSION_SECRET||"change-this-secret-before-production",
 resave:false, saveUninitialized:false,
 cookie:{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:1000*60*60*24*7}
}));
app.use(express.static(path.join(__dirname,"public")));

const arr=v=>{try{return JSON.parse(v||"[]")}catch{return[]}};
const pub=u=>({id:u.id,name:u.name,email:u.email,country:u.country,bio:u.bio,goals:arr(u.goals),habits:arr(u.habits),interests:arr(u.interests),prefs:arr(u.prefs)});
function auth(req,res,next){if(!req.session.userId)return res.status(401).json({error:"Please log in."});next()}
function score(a,b){
 const overlap=(x,y)=>{x=new Set(x);return y.filter(v=>x.has(v)).length};
 const g=overlap(arr(a.goals),arr(b.goals)), i=overlap(arr(a.interests),arr(b.interests)), h=overlap(arr(a.habits),arr(b.habits)), p=overlap(arr(a.prefs),arr(b.prefs));
 const base=Math.min(100,48+g*7+i*5+h*3+p*4);
 return Math.max(50,Math.min(99,base));
}
app.get("/api/me",auth,(req,res)=>res.json(pub(db.prepare("SELECT * FROM users WHERE id=?").get(req.session.userId))));
app.post("/api/register",async(req,res)=>{
 const {name,email,password,country=""}=req.body;
 if(!name||!email||!password||password.length<6)return res.status(400).json({error:"Name, email and a 6+ character password are required."});
 try{
  const hash=await bcrypt.hash(password,12);
  const info=db.prepare("INSERT INTO users(name,email,password_hash,country) VALUES(?,?,?,?)").run(name,email.toLowerCase(),hash,country);
  req.session.userId=info.lastInsertRowid;
  res.json({ok:true});
 }catch(e){res.status(400).json({error:"That email is already registered."})}
});
app.post("/api/login",async(req,res)=>{
 const u=db.prepare("SELECT * FROM users WHERE email=?").get((req.body.email||"").toLowerCase());
 if(!u||!(await bcrypt.compare(req.body.password||"",u.password_hash)))return res.status(401).json({error:"Invalid email or password."});
 req.session.userId=u.id;res.json({ok:true});
});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.put("/api/profile",auth,(req,res)=>{
 const fields=["name","country","bio","goals","habits","interests","prefs"];
 const data={...req.body};
 for(const f of ["goals","habits","interests","prefs"])if(Array.isArray(data[f]))data[f]=JSON.stringify(data[f]);
 const sets=fields.filter(f=>data[f]!==undefined).map(f=>`${f}=@${f}`).join(",");
 db.prepare(`UPDATE users SET ${sets} WHERE id=@id`).run({...data,id:req.session.userId});
 res.json(pub(db.prepare("SELECT * FROM users WHERE id=?").get(req.session.userId)));
});
app.get("/api/discover",auth,(req,res)=>{
 const me=db.prepare("SELECT * FROM users WHERE id=?").get(req.session.userId);
 const rows=db.prepare("SELECT * FROM users WHERE id<>? ORDER BY id DESC LIMIT 100").all(req.session.userId);
 const existing=new Set(db.prepare("SELECT other_id FROM connections WHERE user_id=?").all(req.session.userId).map(x=>x.other_id));
 const out=rows.map(u=>({...pub(u),score:score(me,u),connected:existing.has(u.id)})).sort((a,b)=>b.score-a.score);
 res.json(out);
});
app.post("/api/connect/:id",auth,(req,res)=>{
 const other=Number(req.params.id);
 if(other===req.session.userId)return res.status(400).json({error:"You cannot connect to yourself."});
 const exists=db.prepare("SELECT 1 FROM connections WHERE user_id=? AND other_id=?").get(req.session.userId,other);
 if(!exists) db.prepare("INSERT INTO connections(user_id,other_id,status) VALUES(?,?,?)").run(req.session.userId,other,"accepted");
 res.json({ok:true});
});
app.get("/api/connections",auth,(req,res)=>{
 const rows=db.prepare(`SELECT u.* FROM users u JOIN connections c ON c.other_id=u.id WHERE c.user_id=? AND c.status='accepted'`).all(req.session.userId);
 res.json(rows.map(pub));
});
app.get("/api/messages/:id",auth,(req,res)=>{
 const id=Number(req.params.id);
 const rows=db.prepare(`SELECT m.*,u.name sender_name FROM messages m JOIN users u ON u.id=m.sender_id
 WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?) ORDER BY m.id`).all(req.session.userId,id,id,req.session.userId);
 res.json(rows);
});
app.post("/api/messages/:id",auth,(req,res)=>{
 const text=(req.body.text||"").trim(); const id=Number(req.params.id);
 if(!text||text.length>2000)return res.status(400).json({error:"Message is empty or too long."});
 db.prepare("INSERT INTO messages(sender_id,receiver_id,text) VALUES(?,?,?)").run(req.session.userId,id,text);
 res.json({ok:true});
});
app.get("/api/experiences",auth,(req,res)=>{
 res.json(db.prepare(`SELECT e.*,u.name,u.country FROM experiences e JOIN users u ON u.id=e.user_id ORDER BY e.id DESC`).all());
});
app.post("/api/experiences",auth,(req,res)=>{
 const {title,body,category="Personal Growth"}=req.body;
 if(!title||!body)return res.status(400).json({error:"Title and experience are required."});
 db.prepare("INSERT INTO experiences(user_id,title,body,category) VALUES(?,?,?,?)").run(req.session.userId,title,body,category);
 res.json({ok:true});
});
app.get("/api/communities",auth,(req,res)=>{
 const rows=db.prepare(`SELECT c.*,EXISTS(SELECT 1 FROM community_members cm WHERE cm.community_id=c.id AND cm.user_id=?) joined FROM communities c`).all(req.session.userId);
 res.json(rows);
});
app.post("/api/communities/:id/join",auth,(req,res)=>{
 const id=Number(req.params.id);
 const exists=db.prepare("SELECT 1 FROM community_members WHERE community_id=? AND user_id=?").get(id,req.session.userId);
 if(!exists){db.prepare("INSERT INTO community_members(community_id,user_id) VALUES(?,?)").run(id,req.session.userId);db.prepare("UPDATE communities SET members=members+1 WHERE id=?").run(id)}
 res.json({ok:true});
});
app.get("/api/health",(req,res)=>res.json({ok:true,app:"GroLink",version:"1.0"}));
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
const port=process.env.PORT||3000;
app.listen(port,()=>console.log(`GroLink running on http://localhost:${port}`));
