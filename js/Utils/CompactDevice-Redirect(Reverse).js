(function() {
    var isDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|webOS/i.test(navigator.userAgent);
    
    if (!isDevice && window.innerWidth >= 1024) {
        window.location.replace("index.html");
    }
})();