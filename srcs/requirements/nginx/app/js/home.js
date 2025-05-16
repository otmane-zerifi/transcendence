const home = document.querySelector(".home");
const games = document.querySelector(".games");
const chat = document.querySelector(".chat");
const profile = document.querySelector(".profile");
const leaderboard = document.querySelector(".leaderboard");
const settings = document.querySelector(".settings");
const friends = document.querySelector(".friends");

const title = document.querySelector(".header p");
const search = document.querySelector(".header .search-bar");


// Disable dragging
function noDrag(event) {
    event.preventDefault();
}
document.addEventListener('dragstart',noDrag,true);

//animate sidebar button
const openBtn = document.querySelector(".open-btn");
openBtn.addEventListener("click", function() {
    document.querySelector("sidebar").style.display = "block";
    openBtn.style.transform = "translateX(-40px)";
})

const closeBtn = document.querySelector(".close-btn");
closeBtn.addEventListener("click", function() {
    document.querySelector("sidebar").style.display = "none";
    document.querySelector("sidebar").removeAttribute("style");
    openBtn.style.display = "flex";

    openBtn.style.transform = "translateX(0px)";
})


// animate sidebar
const sidebar = document.querySelector("sidebar");
openBtn.addEventListener("click", function() {
    sidebar.classList.add("sidebar-active");
});
closeBtn.addEventListener("click", function() {
    sidebar.classList.remove("sidebar-active");
});
document.addEventListener("click", function(event) {
    if (!sidebar.contains(event.target) && !openBtn.contains(event.target)) {
        sidebar.style.transform = "translateX(-250px)";
        openBtn.style.display = "flex";
        sidebar.classList.remove("sidebar-active");
        openBtn.style.transform = "translateX(0px)";
        return ;
    }
    sidebar.removeAttribute("style");
});

// Get the required elements
const searchBar = document.querySelector(".header .search-bar");
const titleElement = document.querySelector(".header .title");
const userAvatar = document.querySelector(".header .user-avatar");
const circles = document.querySelector(".header .circles");

// When the search bar is clicked, expand it and hide other elements
searchBar.addEventListener("click", function (event) {
    searchBar.classList.add("search-bar-expand");
    titleElement.classList.add("p-hide");
    circles.classList.add("circles-hide");
    document.querySelector(".search-text").classList.add("input-expand");
    event.stopPropagation(); // Prevent the click event from propagating further
});

// Close the search bar when clicking outside of it
document.addEventListener("click", function (event) {
    if (!searchBar.contains(event.target)) {
        searchBar.classList.remove("search-bar-expand");
        titleElement.classList.remove("p-hide");
        circles.classList.remove("circles-hide");
        document.querySelector(".search-text").classList.remove("input-expand");
    }
});
