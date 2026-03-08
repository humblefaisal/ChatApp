const sock = io();

function login(){
    const nameElement = document.getElementById('name');
    const passwordElement = document.getElementById('password');
    userName = nameElement.value;
    userPassword = passwordElement.value;
    sock.emit("login-attempt",{
        name:userName,
        password:userPassword
    });
    document.querySelector(".your-name").textContent = userName;
}

function signUp(){
    const nameElement = document.getElementById('name');
    const passwordElement = document.getElementById('password');
    userName = nameElement.value;
    userPassword = passwordElement.value;
    sock.emit("signup-attempt",{
        name:userName,
        password:userPassword
    });
    document.querySelector(".your-name").textContent = userName;
}

function containOTP(text){
    const otpRegex = /\b\d{6}\b/;
    return otpRegex.test(text);
}

function containInappropriateWords(text){
    const lowerCaseText = text.toLowerCase();
    for(word of filterWOrds){
        if(lowerCaseText.includes(word)){
            return true;
        }    
    }
    return false;
}
function sendButton(){
    const message = {}
    const messageElement = document.querySelector('#message-box');
    message.text = messageElement.value;
    if(containOTP(message.text)){
        if(!confirm('Your message contains an OTP. Are you sure you want to send it?')){
            return;
        }
    }
    // if(containInappropriateWords(message.text)){
    //     if(!confirm('Your message contains inappropriate words. Are you sure you want to send it?')){
    //         return;
    //     }
    // }
    message.user = userName;
    const fileInput = document.querySelector('#add-file-button');
    if(fileInput.files.length >0){
        const file = fileInput.files[0];
        
        message.file = {
            name: file.name,
            id: Date.now(),
            data: file
        };
    }
    message.time=Date.now();
    message.groupName = currentGroupName;
    console.log(message);
    sock.emit('message-send',{
        message:message
    });
    messageElement.value = '';
    fileInput.value='';
}

function createGroup(){
    const groupName = prompt("Enter the name of the group");
    if(groupName){
        sock.emit("create-group",{
            groupName:groupName,
            creatorName:userName
        });
    }
}

function joinGroup(groupName){
    currentGroupName = groupName;
    sock.emit("join-group",{
        groupName:groupName,
        userName:userName
    });
}

function wrapMessage(message) { // time: YYYY-MM-DD
    const messageDiv = document.createElement('div');
    const messageTextDiv = document.createElement('div');
    const messageHeaderDiv = document.createElement('div');
    const headLeft = document.createElement('button');
    headLeft.innerHTML=`<strong>${message.user}</strong>`;
    headLeft.addEventListener('click',()=>{
        const messageUser = message.user;
        const currentUser = userName;
        sock.emit('create-private-chat',{
            user1:currentUser,
            user2:messageUser
        });
    });
    const headRight = document.createElement('time');

    headLeft.innerText = message.user;
    console.log(message.user);
    headRight.dateTime = message.time;
    headRight.textContent = message.time;

    messageTextDiv.innerHTML = `<p>${message.text}</p>`;

    messageHeaderDiv.appendChild(headLeft);
    // messageHeaderDiv.appendChild(headRight);

    messageDiv.appendChild(messageHeaderDiv);
    if(message.file){
        const messageFileDiv = document.createElement('div');
        const messageFileButton = document.createElement('button');
        messageFileButton.addEventListener('click',()=>{
            sock.emit('file-download',{
                id:message.filename
            });
        });
        messageFileDiv.appendChild(messageFileButton);
        messageDiv.appendChild(messageFileDiv);
    }
    messageDiv.appendChild(messageTextDiv);
    messageDiv.classList.add('message-box');
    return messageDiv;
}


function wrapGroup(groupName){
    const groupJoinBttn = document.createElement('button');
    groupJoinBttn.addEventListener('click',()=>{
        //emit joining req
        isPrivateMode=false;
        const leaveGroupBttn = document.createElement('button');
        const groupNameElement = document.createElement('span');
        groupNameElement.textContent = groupName;
        leaveGroupBttn.textContent = 'Leave Group';
        leaveGroupBttn.addEventListener('click',leaveGroup);
        const groupHeaderElement = document.querySelector('.message-head');
        groupHeaderElement.appendChild(groupNameElement);
        groupHeaderElement.appendChild(leaveGroupBttn);
        window.currentGroupName = groupName;
        sock.emit('join-group',{groupName:groupName, userName:userName});
        console.log(groupName);
    });
    groupJoinBttn.textContent = groupName;
    return groupJoinBttn;
}

function leaveGroup(){
    const groupHeaderElement = document.querySelector('.message-head');
    const messageContentElement = document.querySelector('.message-content');
    messageContentElement.innerHTML='';
    groupHeaderElement.innerHTML = '';
    window.currentGroupName = '';
    sock.emit('leave-group',{userName:userName});
    return null;
}

function wrapPrivateChat(otherUserName){
    const groupJoinBttn = document.createElement('button');
    groupJoinBttn.addEventListener('click',()=>{
        //emit joining req
        const leaveGroupBttn = document.createElement('button');
        const groupNameElement = document.createElement('span');
        groupNameElement.textContent = groupName;
        leaveGroupBttn.textContent = 'Leave Group';
        leaveGroupBttn.addEventListener('click',leaveGroup);
        const groupHeaderElement = document.querySelector('.message-head');
        groupHeaderElement.appendChild(groupNameElement);
        groupHeaderElement.appendChild(leaveGroupBttn);
        isPrivateMode=true;
        window.currentGroupName = otherUserName;
        sock.emit('join-private-chat',{groupName:otherUserName, userName:userName});
        console.log(otherUserName);
    });
    groupJoinBttn.textContent = otherUserName;
    return groupJoinBttn;
}
sock.on('create-private-chat',data=>{
    const user = data.user;
    const privateChatButton = wrapPrivateChat(user);
    const sideBarElement = document.querySelector('.side-bar');
    sideBarElement.appendChild(privateChatButton);
});
// sock.on('private-chat-data',data=>{

// });
sock.on('private-message-receive',data=>{

})
sock.on('login-result',data=>{

    if(data.status==='login-successfull'){
        // load the chat app somehow 
        document.querySelector('.login-screen-container').style.display="none";
        document.querySelector('.chat-screen').style.display="flex";
    } else {
        const innerHTML = `
            <p>Error Signing in</p>
            <p>Status : ${data.status}</p>
        `;
        document.querySelector('.status').innerHTML= (innerHTML);
    }
});
sock.on('signup-result',data=>{
    if(data.status==='signup-successfull'){
        // load the chat app somehow 
        document.querySelector('.login-screen-container').style.display="none";
        document.querySelector('.chat-screen').style.display="flex";
    } else {
        const innerHTML = `
            <p>Error Signing in</p>
            <p>Status : ${data.status}</p>
        `;
        document.querySelector('.status').innerHTML= (innerHTML);
    }
});
sock.on('group-created',(res)=>{
    const sideBarElement = document.querySelector('.side-bar');
    const groupJoinBttn = wrapGroup(res.groupName);
    sideBarElement.appendChild(groupJoinBttn);
});
sock.on('join-group-result',async data=>{
    if(data.status==='group-does-not-exist'){

    }
    // sock.emit('leave-group',{userName:userName},(res)=>{
    // });
    sock.emit('group-data',{groupName:data.groupName});
    
});
sock.on('group-data',data=>{
    const messages = data.messages;
    const messageContentElement = document.querySelector('.message-content');
    messageContentElement.innerHTML='';
    currentGroupName = data.groupName;
    for(msg of messages){
        const messageElement = wrapMessage(msg);
        messageContentElement.appendChild(messageElement);
    }
})
sock.on('message-receive',data=>{
    const messageContentElement = document.querySelector('.message-content');
    const message = data.message;
    const wrappedMessage = wrapMessage(message);
    messageContentElement.appendChild(wrappedMessage);
});
sock.on('file-download', (file) => {
    const blob = new Blob([file.data]);
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
});
sock.on('group-list-response',data=>{
    const sideBarElement = document.querySelector('.side-bar');
    for(groupName of data.groups){
        const groupJoinBttn = wrapGroup(groupName);
        sideBarElement.appendChild(groupJoinBttn);
    }
});
let userName='ABC';
let userPassword='';
let currentGroupName='';
let currentPrivateUser = '';
let isPrivateMode = false;
document.querySelector("#login-button").addEventListener('click',login);
document.addEventListener('keypress',(e)=>{
    console.log('Key pressed');

    if(e.key=='Enter'){
        console.log('Enter Pressed')
        login();
    }
});
document.querySelector("#signup-button").addEventListener('click',signUp);
document.querySelector("#send-buffer-button").addEventListener('click',sendButton);
document.querySelector("#group-create-button").addEventListener('click',createGroup);


const filterWOrds = ['hate','ugly','kill','murder'];
sock.emit('group-list-request');
// login();
