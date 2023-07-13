let typed = new Typed(".text-autoType", {
    strings: ["Frontend Designer", "Backend Developer", "Content Writer", "Online Instructor"],
    typeSpeed: 100,
    backSpeed: 50,
    backDelay: 1000,
    loop: true
});

$(document).ready(function () {
    $("#js-menu-toggle").click(function () {
        $("#js-nav-menu").slideToggle();
    })
})
