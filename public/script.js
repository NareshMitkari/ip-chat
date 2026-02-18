const socket = io();
let currentUser = null;
let selectedUser = null;
let selectedFile = null;

/* REGISTER */
async function register(){
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  if(!username || !password) return alert("Enter username and password");

  const res = await fetch("/register",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({username,password})
  });
  const data = await res.json();
  if(!data.success) return alert("Username exists");
  loginUser(data.user);
}

/* LOGIN */
async function login(){
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  if(!username || !password) return alert("Enter username and password");

  const res = await fetch("/login",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({username,password})
  });
  const data = await res.json();
  if(!data.success) return alert("Login failed");
  loginUser(data.user);
}

/* LOGIN USER */
function loginUser(user){
  currentUser = user;
  socket.emit("join",user);
  document.getElementById("auth").classList.add("hidden");
  document.getElementById("chatList").classList.remove("hidden");
  loadUsers();
}

/* LOAD USERS */
async function loadUsers(){
  const res = await fetch("/users");
  const users = await res.json();
  const list = document.getElementById("userList");
  list.innerHTML = "";
  users.forEach(u=>{
    if(u.id===currentUser.id) return;
    const div = document.createElement("div");
    div.className="user";
    div.innerText = u.username;
    div.onclick = ()=>openChat(u);
    list.appendChild(div);
  });
}

/* OPEN CHAT */
async function openChat(u){
  selectedUser=u;
  document.getElementById("chatList").classList.add("hidden");
  document.getElementById("chatScreen").classList.remove("hidden");
  document.getElementById("chatName").innerText=u.username;

  const res = await fetch(`/messages/${currentUser.id}/${u.id}`);
  const msgs = await res.json();
  const box = document.getElementById("messages");
  box.innerHTML="";
  msgs.forEach(render);
}

/* CLOSE CHAT */
function closeChat(){
  document.getElementById("chatScreen").classList.add("hidden");
  document.getElementById("chatList").classList.remove("hidden");
  selectedUser=null;
  removePreview();
}

/* RENDER MESSAGE */
function render(msg){
  const div=document.createElement("div");
  div.className="msg "+(msg.from===currentUser.id?"self":"other");
  let content = "";

  if(msg.type==="image"){
    content=`<img src="/uploads/${msg.content}">`;
  } else {
    content=msg.content;
  }

  div.innerHTML = content + `<div class="meta">${msg.time}</div>`;
  document.getElementById("messages").appendChild(div);
  div.scrollIntoView({behavior:"smooth"});
}

/* IMAGE PREVIEW */
function handlePreview(file){
  if(!file) return;
  selectedFile = file;
  const preview = document.getElementById("imagePreview");
  const img = document.getElementById("previewImg");
  img.src = URL.createObjectURL(file);
  preview.classList.remove("hidden");
}
function removePreview(){
  selectedFile = null;
  document.getElementById("imagePreview").classList.add("hidden");
  document.getElementById("previewImg").src = "";
}
function triggerFile(){ document.getElementById("fileInput").click(); }

/* SEND TEXT OR IMAGE */
async function sendTextOrImage(){
  if(selectedFile){
    const form = new FormData();
    form.append("file", selectedFile);
    const res = await fetch("/upload", { method: "POST", body: form });
    const data = await res.json();

    socket.emit("sendMessage", {
      from: currentUser.id,
      to: selectedUser.id,
      type: "image",
      content: data.file
    });
    removePreview();
  } else {
    const input = document.getElementById("msgInput");
    if(!input.value) return;
    socket.emit("sendMessage",{
      from: currentUser.id,
      to: selectedUser.id,
      type: "text",
      content: input.value
    });
    input.value = "";
  }
}

/* RECEIVE MESSAGE */
socket.on("newMessage",(msg)=>{
  if(!selectedUser) return;
  if(msg.from!==selectedUser.id && msg.to!==selectedUser.id) return;
  render(msg);
});
