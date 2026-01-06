(function() {
    var isDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|webOS/i.test(navigator.userAgent);
    
    var isCompactScreen = window.innerWidth < 1024;

    if (isDevice || isCompactScreen) {
        window.location.replace("CompactDevice.html");
    }
})();