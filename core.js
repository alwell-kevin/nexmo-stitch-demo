var base_url = "https://memessaging-gateway.herokuapp.com"

var users, conversations;

var activeUser = JSON.parse(localStorage.getItem('active_user'));
var conversation = JSON.parse(localStorage.getItem('active_conversation'));

if (!activeUser || !activeUser.uuid) {
    getUsers();
}

if (!conversation || !conversation.uuid) {
    getConversations();
}

$(document).ready(function () {

    var activeUser = JSON.parse(localStorage.getItem('active_user'));
    if (!activeUser) {
        activeUser = {};
    }
    if (activeUser.name && !onChatScreen()) {
        enterChatScreen(activeUser);
    } else if (!activeUser.name && onChatScreen()) {
        goToLogin();
    }

    $("#form-signin").click(function () {
        activeUser.name = $("#inputEmail").val()
        if (activeUser.name != "") {
            //Check if user exists. 
            //If so, check if in conversation. 
            //If not add to conversation.
            //If not, create, then add to conversation.
            var found = false;

            for (var i = 0; i < users.length; i++) {
                if (users[i].name === activeUser.name) {
                    found = true;
                    activeUser = users[i];
                    localStorage.setItem('active_user', JSON.stringify(activeUser));

                    getConversationMembers(conversation.uuid).then(function (conversationMembersList) {
                        //Update active conversation with list of members.
                        var activeConversation = JSON.parse(localStorage.getItem('active_conversation'));
                        activeConversation.memberList = conversationMembersList;
                        localStorage.setItem("active_conversation", JSON.stringify(activeConversation));

                        var containedWithin = conversationMembersList.some(c => c.user_name === activeUser.name) // CONVERSATION CONTAIN THIS MEMEBR
                        if (conversationMembersList.length === 0 || !containedWithin) {
                            //Add member to conversation
                            console.log("ADDING ACTIVE USER TO CONVERSATION: ", activeUser);
                            addUserToConversation(activeUser, conversation);
                            // console.log("ADDED USER TO CONV", resp);
                            enterChatScreen(activeUser);
                            // })
                        } else {
                            enterChatScreen(activeUser);
                        }

                    })
                    console.log("User Exists", activeUser)
                }
            }

            if (!found) {
                createUser(activeUser.name).then(function (user) {
                    console.log("HERE KEVIN: ", user);
                    addUserToConversation(user, conversation).then(function (conversation) {
                        activeUser = user;
                        console.log("new user added to conversation: ", user)
                        enterChatScreen(activeUser);
                    })

                })

                console.log("USER CREATED: ", activeUser);
            }
        }
    })

    $(".messages").animate({
        scrollTop: $(document).height()
    }, "fast");

    $("#profile-img").click(function () {
        $("#status-options").toggleClass("active");
        goToLogin();

    });

    $(".expand-button").click(function () {
        $("#profile").toggleClass("expanded");
        $("#contacts").toggleClass("expanded");
    });

    $("#status-options ul li").click(function () {
        $("#profile-img").removeClass();
        $("#status-online").removeClass("active");
        $("#status-away").removeClass("active");
        $("#status-busy").removeClass("active");
        $("#status-offline").removeClass("active");
        $(this).addClass("active");

        if ($("#status-online").hasClass("active")) {
            $("#profile-img").addClass("online");
        } else if ($("#status-away").hasClass("active")) {
            $("#profile-img").addClass("away");
        } else if ($("#status-busy").hasClass("active")) {
            $("#profile-img").addClass("busy");
        } else if ($("#status-offline").hasClass("active")) {
            $("#profile-img").addClass("offline");
        } else {
            $("#profile-img").removeClass();
        };

        $("#status-options").removeClass("active");
    });
});

function enterChatScreen(activeUser) {

    $("#signInContainer").hide();

    getUserJwt(activeUser.name).then(function (jwtObj) {
        activeUser.jwt = jwtObj.user_jwt;
        localStorage.setItem("active_user", JSON.stringify(activeUser));
        window.location.href = './chatWindow.html';
        return false;
    })
}

function goToLogin() {
    window.location.href = './index.html';
    localStorage.removeItem('active_user');
    localStorage.removeItem('active_conversation');
    activeUser = {};
    $("#signInContainer").show();
}

function onChatScreen() {
    if (window.location.href.indexOf("chatWindow") === -1) {
        return false
    }
    return true
}

function addUserToConversation(activeUser, conversation) {
    return new Promise( /* executor */ function (resolve, reject) {
        $.ajax({
            url: base_url + '/conversationmember',
            type: 'GET',
            dataType: 'jsonp',
            data: {
                conversationId: conversation.uuid,
                userId: activeUser.id,
                action: "join"
            },
            success: function (data) {
                console.log("Success addUserToConversation", data);
                resolve(data)
            },
            error: function (err) {
                console.log('Failed! addUserToConversation', err);
                reject(err);
            }
        });
    })
}

function getUserConversations(userId) {
    $.ajax({
        url: base_url + '/conversation',
        type: 'GET',
        dataType: 'jsonp',
        data: {
            "userId": userId
        },
        success: function (data) {
            console.log("USER CONVERSATION DATA: ", data);
            var user = JSON.parse(localStorage.getItem('active_user'));
            user.conversation = data;
            conversation = user.conversation;
            localStorage.setItem("active_user", JSON.stringify(user));
        },
        error: function (err) {
            console.log('Failed!', err);
        }
    });
}

function getConversationMembers(convId) {
    return new Promise( /* executor */ function (resolve, reject) {
        $.ajax({
            url: base_url + '/conversationmembers',
            type: 'GET',
            dataType: 'jsonp',
            data: {
                "convId": convId
            },
            success: function (data) {
                console.log("conversationMembers: ", data)
                conversation.members = data;
                console.log(data)
                resolve(data);
            },
            error: function (err) {
                console.log(err)
                resolve(err)
            }
        });
    });
}

function getConversations() {
    $.ajax({
        url: base_url + '/conversations',
        type: 'GET',
        dataType: 'jsonp',
        success: function (data) {
            console.log("Conversations:", data._embedded.conversations);
            if (data._embedded.conversations.length === 0) {
                createConversation("kevin-conversation");
            }

            conversations = data._embedded.conversations;
            conversation = conversations[0];
            localStorage.setItem("active_conversation", JSON.stringify(conversation));
        },
        error: function (err) {
            console.log('Failed!', err);
        }
    });
}

function createConversation(displayName) {
    $.ajax({
        url: base_url + '/conversations',
        type: 'POST',
        dataType: 'jsonp',
        data: {
            "displayName": displayName
        },
        success: function (data) {
            console.log("CREATED CONVERSATION: ", data)

            conversations = [data];
            return data
        },
        error: function (err) {
            console.log('Failed!', err);
        }
    });
}

function getUsers() {
    $.ajax({
        url: base_url + '/users',
        type: 'GET',
        dataType: 'jsonp',
        success: function (data) {
            console.log("Success", data);
            users = data;
        },
        error: function (err) {
            console.log('Failed!', err);
        }
    });
}

function createUser(userName) {
    return new Promise( /* executor */ function (resolve, reject) {
        $.ajax({
            url: base_url + '/users',
            type: 'POST',
            dataType: 'json',
            data: {
                "username": userName,
                "admin": true
            },
            success: function (data) {
                if (data.statusCode === 200) {
                    var user = JSON.parse(localStorage.getItem('active_user'));
                    user.user_jwt = data.user_jwt
                    user.name = userName;
                    user.id = data.user.id
                    localStorage.setItem("active_user", JSON.stringify(user));
                    resolve(user)
                } else {
                    console.log("CREATE USER DATA: ", data);
                    var user = {}
                    user.user_jwt = data.user_jwt
                    user.id = data.user.id
                    user.name = userName;
                    localStorage.setItem("active_user", JSON.stringify(user));
                    resolve(user)
                }
            },
            error: function (err) {
                err = JSON.parse(err);

                console.log('Create User Failed! ', err);
                resolve(err)
            }
        });
    })
}

function getUserJwt(userId) {
    return new Promise(function (resolve, reject) {
        $.ajax({
            url: base_url + '/jwt/' + userId,
            type: 'GET',
            dataType: 'jsonp',
            data: {
                "admin": true
            },
            success: function (data) {
                console.log("JWT Success", data);
                resolve(data)
            },
            error: function (err) {
                console.log('JWT Failed!', err);
                reject(err)
            }
        });
    })
}