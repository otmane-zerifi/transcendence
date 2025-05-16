export function initializeSidebar() {
    const openBtn = document.querySelector(".open-btn");
    const closeBtn = document.querySelector(".close-btn");
    const sidebar = document.querySelector("sidebar");

    // Disable dragging
    function noDrag(event) {
        event.preventDefault();
    }
    document.addEventListener('dragstart', noDrag, true);

    //animate sidebar button
    openBtn.addEventListener("click", function() {
        document.querySelector("sidebar").style.display = "block";
        openBtn.style.transform = "translateX(-40px)";
    });

    closeBtn.addEventListener("click", function() {
        document.querySelector("sidebar").style.display = "none";
        document.querySelector("sidebar").removeAttribute("style");
        openBtn.style.display = "flex";
        openBtn.style.transform = "translateX(0px)";
    });

    // animate sidebar
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
            return;
        }
        sidebar.removeAttribute("style");
    });
}
