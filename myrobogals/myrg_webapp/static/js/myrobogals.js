/*!

myRobogals

20140705

*/

var myRG = myRG || {};

(function(myRG){
    /*
     *  Start up
     */     
    // Model store object for stamping
    function modelStore(){
        this.store = {};
        
        this.set = function (key, value){
            this.store[key] = value;
            return this.get(key);
        };
        
        this.get = function (key){
            return this.store[key];
        };
        
        this.reset = function (key){
            this.store = {};
        };
    };

    // Various bits
    myRG.globalStore = new modelStore();
    myRG.appStore = new modelStore();
    myRG.userStore = new modelStore();
    myRG.settings = new modelStore();
    myRG.jq = {};
    myRG.functions = {};
        
    // Shorthands
    var s = myRG.settings;
    var jq = myRG.jq;
    var g = myRG.globalStore;
    var a = myRG.appStore;
    var u = myRG.userStore;
    var f = myRG.functions;
        
    // Set settings
    s.set("INIT_STARTUP_LATENCY_ALLOWANCE", 500);     // ms
    s.set("INIT_DEFAULT_ANON_APP", "login");
    s.set("INIT_DEFAULT_USER_APP", "dashboard");
    
    s.set("TRAY_MIN_TIME", 3500);                   // ms
    s.set("TRAY_WAIT_BEFORE_SCROLL", 1500);         // ms
    s.set("TRAY_WAIT_AFTER_SCROLL", 1500);          // ms
    s.set("TRAY_SCROLL_SPEED", 12);                 // ms/px (lower = faster)
    s.set("TRAY_TRANSITION_SPEED", 500);            // ms/px (lower = faster)
    
    s.set("API_ROOT_URL", "/api/1.0/");
    s.set("RESOURCE_ROOT_URL", "/app/resource/");
    
    // CSRF and AJAX
    // https://docs.djangoproject.com/en/1.6/ref/contrib/csrf/#ajax
    function getCookie(a){var b=null;if(document.cookie&&""!=document.cookie)for(var d=document.cookie.split(";"),c=0;c<d.length;c++){var e=jQuery.trim(d[c]);if(e.substring(0,a.length+1)==a+"="){b=decodeURIComponent(e.substring(a.length+1));break}}return b}
    var csrftoken=getCookie("csrftoken");
    function csrfSafeMethod(a){return/^(GET|HEAD|OPTIONS|TRACE)$/.test(a)}
    $.ajaxSetup({beforeSend:function(a,b){csrfSafeMethod(b.type)||this.crossDomain||a.setRequestHeader("X-CSRFToken",csrftoken)}});    
    
    // Functions
    // Test nested obj properties
    // http://stackoverflow.com/a/4676258
    function testPropertyExists(a,e){for(var c=e.split("."),b=0,f=c.length;b<f;b++){var d=c[b];if(null!==a&&"object"===typeof a&&d in a)a=a[d];else return!1}return!0};

    // URL generators
    f.generateAPIURL = function(endpoint) {
        return s.get("API_ROOT_URL") + endpoint.replace(/^\/|\/$/g, '') + ".json";
    }
    
    f.generateResURL = function(resource) {
        return s.get("RESOURCE_ROOT_URL") + resource.replace(/^\/|\/$/g, '') + ".html";
    }
    
    // Tabbable elements (for overlay and tabbing disabling)
    f.getTabbableElem = function() {
        return $(":tabbable");
    }
    
    f.storeTabbableElem = function() {
        var tabbableElemArr = [];
        f.getTabbableElem().each(function(){
            var elemPairObj = {};
            elemPairObj.elem = this;
            elemPairObj.tabIndex = $(this).attr("tabindex") || 0;
            tabbableElemArr.push(elemPairObj);
        });
        
        return g.set("TABBABLE_ELEM_ARR", tabbableElemArr);
    }
    
    f.disableAllTabbableElem = function() {
        var tabbableElemArr = g.get("TABBABLE_ELEM_ARR") || f.storeTabbableElem();
        $.each(tabbableElemArr, function(i,elemPairObj){
            $(elemPairObj.elem).attr("tabindex",-1);
        });
    }
    
    f.enableAllTabbableElem = function() {
        var tabbableElemArr = g.get("TABBABLE_ELEM_ARR") || [];
        $.each(tabbableElemArr, function(i,elemPairObj){
            $(elemPairObj.elem).attr("tabindex",elemPairObj.tabIndex);
        });
        g.set("TABBABLE_ELEM_ARR", 0);
    }
    
    // AppCache
    f.updateApp = function(){
        g.set("MYRG_UPDATE_READY",1);
    };
    
    
    // API and resource calls
    f.fetchAPI = function(endpoint, data, type){
        var data = data || {};
        var type = type || "POST";
        
        var data_obj = {
                        contentType: 'application/json',
                        type: type
                       }
                       
        if (!csrfSafeMethod(type)){
            data_obj.data = JSON.stringify(data);
        }
        
        return $.ajax(f.generateAPIURL(endpoint), data_obj);
    }
    
    f.fetchResource = function(resource){
        return $.get(f.generateResURL(resource));
    }
    
    
    // Common API calls
    f.fetchWhoAmI = function(){
        return f.fetchAPI("/self/whoami",{});
    }
    
    f.fetchMyRoles = function(){
        return f.fetchAPI("/self/roles", null, "GET");
    }
    
    
    
    // Prefetch user information
    u.set("WHOAMI_XHR",f.fetchWhoAmI());
    u.set("MYROLES_XHR",f.fetchMyRoles());
    
    
    
    // Grab state
    g.set("STATE", History.getState());
    
    
    
    
    /*
     *  DOM Ready
     */  
    $(function(){
        // Grab jQuery objects of common DOM elements
        jq.body = $("body");
        jq.menu = $("#menu");
        jq.tray = $("#tray");
        jq.stage = $("#stage");
        jq.header = $("#header");
        jq.overlay = $("#overlay");
        jq.profile = jq.menu.find(".profile");
        jq.menuUnderlay = $("#menu-underlay");

        // Media Queries
        enquire.register("(min-width: 950px)", function() {
            $("html").removeClass().addClass("large");
        });
        enquire.register("(max-width: 949px)", function() {
            $("html").removeClass().addClass("small");
        });
    
        // Grab Gravatar template
        g.set("GRAVATAR_TEMPLATE", jq.profile.find(".image").data("image"));
        
        
        // Functions
        // Error message -> Tray
        f.throwError = function(error) {
            f.setTray('<b><i class="fa fa-frown-o"></i> Error: </b>'+error.message,"fail",false);
            
            throw error;
        }
        
        // Tray
        f.clearTrayActivity = function () {
            jq.tray.stop();
            
            if (g.get("TRAY_CLOSE_TIMER")) {
                clearTimeout(g.get("TRAY_CLOSE_TIMER"));
            }
        }
        
        f.openTray = function (closable, time) {
            f.clearTrayActivity();
            jq.body.addClass("tray-open");
            
            var diff = jq.tray.children(".text").outerWidth() - jq.tray.width();
            
            var scrollTime = diff * s.get("TRAY_SCROLL_SPEED");
            var trayOpenTime = s.get("TRAY_WAIT_BEFORE_SCROLL") + scrollTime + s.get("TRAY_WAIT_AFTER_SCROLL");
            
            if (trayOpenTime < time) {
                trayOpenTime = time;
            }
            
            if (diff > 0) {
                jq.tray.delay(s.get("TRAY_WAIT_BEFORE_SCROLL")).animate({
                    scrollLeft: diff
                }, scrollTime, "linear");
            }
            
            if (closable) {
                return g.set("TRAY_CLOSE_TIMER", setTimeout(f.closeTray, trayOpenTime));
            } else {
                return g.set("TRAY_CLOSE_TIMER", -1);
            }
        }
        
        f.setTray = function (html, className, closable, time){
            closable = typeof closable !== 'undefined' ? closable : true;
            className = className || "";
            time = time || s.get("TRAY_MIN_TIME");
            
            clearTimeout(g.get("TRAY_CLASS_REMOVE_TIMER"));
            jq.tray.removeClass();
            jq.tray.addClass(className);
            
            jq.tray.scrollLeft(0);
            jq.tray.children(".text").html(html);
            
            return f.openTray(closable, time);
        }
        
        f.closeTray = function (){
            f.clearTrayActivity();
            jq.body.removeClass("tray-open");
            
            g.set("TRAY_CLASS_REMOVE_TIMER", setTimeout(function(){
                jq.tray.removeClass();
            }), s.get("TRAY_TRANSITION_SPEED")+33)
        }
        
        // Overlay + Modal window
        f.showOverlay = function() {
            f.disableAllTabbableElem();
            jq.body.addClass("overlay");
        }
        
        f.closeOverlay = function() {
            f.enableAllTabbableElem();
            jq.body.removeClass("overlay");
            jq.overlay.children(".modal-window").remove();
        }
        
        f.openModal = function () {
            f.showOverlay();
        }
        
        f.setModal = function (html, title, buttons, className, closable) {
            closable = typeof closable !== 'undefined' ? closable : true;
            title = title || "";
            buttons = buttons || {};
            className = className || "";
            
            var modalWindowElem = $("<div>", {"class": "modal-window"}).addClass(className);
            modalWindowElem.append($("<div>", {"class": "title"}).html(title));
            if (closable){
                modalWindowElem.append($("<div>", {"class": "close-button", "tabindex": 0}).click(function(){
                    f.closeModal();
                }));
            }
            modalWindowElem.append($("<div>", {"class": "content"}).html(html));
            modalWindowElem.append($("<div>", {"class": "buttons"}).html(""));
            
            jq.overlay.append(modalWindowElem);
            
            f.openModal();
        }
        
        f.closeModal = function (){
            f.closeOverlay();
        }
        
        // Menu
        f.toggleMenu = function (){
            if (!jq.body.hasClass("menu-open")) {
                if (!jq.body.hasClass("menu-enabled")) {
                    return;
                }
            }
            jq.body.toggleClass("menu-open");
        }
        
        f.toggleUserMenu = function (){
            jq.body.toggleClass("user-open");
        }
        
        // User profile
        f.updateUser = function(whoami) {
            if (whoami) {
                u.set("ID",whoami.user.id);
                u.set("WHOAMI_OBJ",whoami);
            } else {
                u.set("ID",0);
                u.set("WHOAMI_OBJ",0);
            }
            
            f.updateProfile();
        }
        
        f.updateProfile = function() {
            var whoami = u.get("WHOAMI_OBJ");
            
            if (whoami) {
                f.loadProfileImage(whoami.user.data.gravatar_hash);
                f.loadProfileName(whoami.user.data.display_name);
                
                if (testPropertyExists(whoami, 'role_class.data')){
                    f.loadProfileRole(whoami.role_class.data.name);
                    f.loadProfileGroup(whoami.group.data.name);
                } else {
                    f.loadProfileRole("");
                    f.loadProfileGroup("");
                }
            } else {
                f.loadProfileImage();
                f.loadProfileName("Anonymous User");
                f.loadProfileRole("");
                f.loadProfileGroup("");
            }
            
            
        }
        
        f.loadProfileImage = function (gravatarHash){
            var backgroundImage = "none";
            
            if (gravatarHash){
                backgroundImage = "url("+ g.get("GRAVATAR_TEMPLATE").replace("{gravatar_hash}",gravatarHash) +")";
            }
            
            jq.profile.find(".image").css("background-image",backgroundImage);
        }
        
        f.loadProfileName = function (name){
            jq.profile.find(".name").text(name);
        }
        
        f.loadProfileRole = function (role){
            jq.profile.find(".role").text(role);
        }
        
        f.loadProfileGroup = function (group){
            jq.profile.find(".group").text(group);
        }
        
        
        // App (resource) loading
        f.loadApp = function (appName){
            // Reset the application store
            a.reset();
            
            var app_xhr = f.fetchResource(appName);
            
            app_xhr
                .always(function(){
                    
                })
                .done(function(data){
                    // Remove classes which end in "-enabled"
                    // http://stackoverflow.com/a/5182103
                    jq.body.removeClass(function (i, css){
                        return (css.match (/\S+-enabled\b/g) || []).join(' ');
                    });                   
                    
                    // data -> #stage
                    jq.stage.html(data);
                    
                    // Apply classes which the app requires
                    jq.body.addClass(a.get("BODY_CLASS").join(" "));
                })
                .fail(function(){
                
                })
                
            return app_xhr;
        }
        
        // Events
        jq.tray.click(function(){
            if (g.get("TRAY_CLOSE_TIMER") != -1){
                f.closeTray();
            }
        });
        
        jq.header.click(function(){
            f.toggleMenu();
        })
        
        jq.menuUnderlay.click(function(){
            f.toggleMenu();
        })
        
        jq.profile.click(function(e){
            f.toggleUserMenu();
            e.preventDefault();
        })
        
       
        
        /*
         * Start!
         */         
        
        // If old IE (lt. IE 9) then stop
        if ($("#ie-old-warning").length){
            jq.body.children(":not(#ie-old-warning)").hide();
            return;
        }
        
        
        // Grab user info
        // Add a little bit of latency allowance
        var initLoadMessageTimer = setTimeout(function(){
                                                f.setTray("Loading...","indeterminate",false);
                                                }, s.get("INIT_STARTUP_LATENCY_ALLOWANCE"));
        // XHR is done before DOM ready. See above.
        $.when(u.get("WHOAMI_XHR"), u.get("MYROLES_XHR"))
            .always(function(){
                clearTimeout(initLoadMessageTimer);
                jq.body.addClass("loaded");
            })
            .done(function(whoamiXhrArr, myrolesXhrArr){
                f.updateUser(whoamiXhrArr[0]);
                f.closeTray();
            })
            .fail(function(whoamiXhr, myrolesXhr){                
                // Fires on first error
                if (whoamiXhr.status == 401 || myrolesXhr.status == 401){
                    // 401 => Anon user
                    f.updateUser();
                    f.closeTray();
                    f.loadApp(s.get("INIT_DEFAULT_ANON_APP"));
                } else {
                    f.throwError({
                                    name: 'SERVICE_UNAVAILABLE',
                                    message: 'Service unavailable. Go online or reload the page.'
                                });
                }
            });
    });
})(myRG);