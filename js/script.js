const countDownDate = new Date("Jan 1, 2026 00:00:00").getTime();

const x = setInterval(function() {
    const now = new Date().getTime();
    const distance = countDownDate - now;

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById("timer").innerHTML = days + " Days : " + hours + " hours : "
    + minutes + " Minutes : " + seconds + " Seconds";

    if (distance < 0) {
        clearInterval(x);
        document.getElementById("timer").innerHTML = "HAPPY NEW YEAR!";
    }
}, 1000);