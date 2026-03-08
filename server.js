require('dotenv').config();
const {Server} = require('socket.io');
const http = require('http');
const express = require('express');
const app = express()
const server = http.createServer(app);
const io = new Server(server);
const path = require('path');
const fs = require('fs');
const { count } = require('console');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI("api_key");

const filesPath = path.join(__dirname,'DataBase','Files')
//to write json fs.writeFileSync(JSON.stringify(object,null,2)) 2->indentation null : a filter function (key,val)=>{return val;}// now same, filtering nothign
// to read const data = fs.readFIleSync('filename.json','utf-8'); parseData = Json.parse(data); then//ParseData    

app.use(express.static(path.join(__dirname,'public')));

const db={};
db.groups = {
    'general':{
        name:'general',
        messages:[]
    }
};
db.userGroup = {

}
db.users = {
    '':{
        password:''
    },
    'ABC':{
        password:''
    }
};
async function filterMessage(message){
    return true;
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const res = await model.generateContent(`Check if the following message contains any inappropriate words, {anything like spam or murder or hate speech} like trolling. If it does, respond with exactly "notok", otherwise respond with exactly "ok". Message: ${message}`);
    const text = res.response.text().trim().toLowerCase();
    console.log(text);
    return text === 'ok';
}
const privateChats = {}; // {chatId: {users:[user1,user2], messages:[]}}
const activeUsers = {}; // { userName: socketId }
const idSocketMap = {}; // { socketId: Socket }
io.on('connection',(client)=>{
    console.log("Client connected yoyo: ",client.id);
    idSocketMap[client.id] = client;
    client.on('login-attempt',data=>{
        //data contains name:username, password:userpassword
        // const jsonData = fs.readFileSync(path.join(__dirname,'DataBase/users.json'))
        // users = JSON.parse(jsonData);
        db.users = db.users || {};
        let res="";
        if(db.users[data.name]){
            if(db.users[data.name].password===data.password){
                res="login-successfull";
                activeUsers[data.name] = client.id;
            } else {
                res="password-incorrect";
            }
        }else{
            res="signup-required";
        }
        client.emit('login-result',{
            status:res
        });
    });
    client.on('signup-attempt',data=>{
        //
        // const jsonData = fs.readFileSync(path.join(__dirname,'DataBase/users.json'))
        // users = JSON.parse(jsonData);
        db.users = db.users || {};
        let res='';
        if(db.users[data.name]){
            res='username-exists';
        } else {
            db.users[data.name]={password:data.password};
            activeUsers[data.name] = client.id;
            res='signup-successfull';
        }
        // fs.writeFileSync(path.join(__dirname,'DataBase/users.json'),JSON.stringify(users,null,2));
        client.emit('signup-result',{
            status:res
        });
    });
    client.on('create-group',data=>{
        //data contains groupName:groupName, creatorName:name of creator
        if(db.groups[data.groupName]){
            //emit joining req
        } else {
            db.groups[data.groupName]={
                name:data.groupName,
                messages:[],
                creator:data.creatorName
            };
            io.emit('group-created',{
                creator:data.creatorName,
                groupName:data.groupName
            });
        }
    });
    client.on('group-list-request',()=>{
        const groupList = Object.keys(db.groups);
        client.emit('group-list-response',{groups:groupList});
    });
    client.on('join-group',data=>{
        //data contains groupName:groupName, !!! userName:userName
        if(db.groups[data.groupName]){
            db.userGroup[data.userName]=data.groupName;
            console.log(`${data.userName} joined ${data.groupName}  group`);
            client.join(data.groupName);
            client.emit('join-group-result',{
                status:'joined-successfully',
                messages:db.groups[data.groupName].messages,
                groupName:data.groupName
            });
        } else {
            client.emit('join-group-result',{
                status:'group-does-not-exist'
            });
        }
    });
    client.on('group-data',data=>{
        if(!db[data.groupName]){

        }
        client.emit('group-data',{messages : db.groups[data.groupName].messages,groupName:data.groupName});
    })
    client.on('message-send',async data=>{
        //data contains name:username, message:message group:groupname
        // client.bro;
        const message  = data.message;
        const res = await filterMessage(message.text); 
        if(res === false){
            message.text = "This message has been removed due to inappropriate content.";
        }
        if(message.file){
            const filename = message.file.id+'_'+message.file.name;
            const fullPath = path.join(filesPath,filename);
            fs.writeFileSync(fullPath,message.file.data);
            message.file.data=null;
            message.filename = filename;
        }
        const groupName =db.userGroup[message.user]; 
        db.groups[groupName].messages.push(message);
        // io.emit('message-receive',{message:message});
        console.log('user : ', data.message.user, ' sent message : ', data.message);
        io.to(db.userGroup[data.message.user]).emit('message-receive',{message:message});
    });
    client.on('file-download',data=>{
        const fileid = data.id;
        const fileData = fs.readFileSync(path.join(filesPath,fileid));
        client.emit('file-download',{
            name:fileid,
            data:fileData
        });
    });
    client.on('leave-group',data=>{
        const userName = data.userName;
        const groupName = db.userGroup[userName];
        if(groupName){
            // delete db.userGroup[userName];
            client.leave(groupName);
        }
    });
    client.once('create-private-chat',data=>{
        const id1 = activeUsers[data.user1];
        const id2 = activeUsers[data.user2];
        const chatId = [data.user1,data.user2].sort().join('-');
        
        if(id1 && id2){
            const groupName = `${data.user1}-${data.user2}-private-chat`;
            db.groups[groupName]={
                name:groupName,
                messages:[],
                //creator:data.user1
            };
            io.to(id1).emit('group-created',{
                groupName:groupName
            });
            io.to(id2).emit('group-created',{
                groupName:groupName
            });
        }
    });
    // client.on('join-private-chat',(data)=>{
    //     const chatId = [data.user1,data.user2].sort().join('-');
    //     if(privateChats[chatId]){
    //         client.emit('group-data',{
    //             messages:privateChats[chatId].messages,
    //             user:data.user2
    //         });
    //     }
    // });
    // client.on('private-message-send',data=>{
    //     const message = data.message;
    //     const chatId = [data.user1,data.user2].sort().join('-');
    //     if(privateChats[chatId]){
    //         privateChats[chatId].messages.push(message);     
    //         const id1 = activeUsers[privateChats[chatId].users[0]];
    //         const id2 = activeUsers[privateChats[chatId].users[1]];
    //         if(id1 && id2){
    //             io.to(id1).emit('private-message-receive',{
    //                 message:message,
    //                 user:data.user2
    //             });
    //             io.to(id2).emit('private-message-receive',{
    //                 message:message,
    //                 user:data.user1
    //             });
    //         }
    //     }
    // });
    client.on('disconnect',data=>{
        // delete activeUsers[];
        console.log('client disconnected : ', client.id)
    });

});

const PORT = 3001;
server.listen(PORT,()=>{
    console.log(`Server running on :  http://localhost:${PORT}`);
})
server.on('close',()=>{
    console.log('Server closed');
}); 
