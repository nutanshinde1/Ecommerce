// ================= Scroll Reveal Animation =================
const reveals = document.querySelectorAll(".reveal");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => { 
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
      }
    }); 
  },
  { threshold: 0.15 }
);

reveals.forEach((el) => observer.observe(el));

// ================= Footer Year =================
const yearSpan = document.getElementById("year");
if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}
