// DOM Elements
const header = document.querySelector(".header");
const menuIcon = document.querySelector(".icon-menu");
const menuBody = document.querySelector(".menu__body");
const testimonialSlides = document.querySelectorAll(".testimonial__slide");
const testimonialDots = document.querySelectorAll(".testimonial__dot");
const prevButton = document.querySelector(".testimonial__prev");
const nextButton = document.querySelector(".testimonial__next");

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  initializeMenu();
  initializeScrollEffects();
  initializeTestimonialSlider();
});

// Menu Functions
function initializeMenu() {
  if (menuIcon && menuBody) {
    menuIcon.addEventListener("click", toggleMenu);
  }
}

function toggleMenu() {
  menuBody.classList.toggle("active");
  menuIcon.classList.toggle("active");
  document.body.classList.toggle("lock");
}

// Scroll Effects
function initializeScrollEffects() {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  });
}

// Testimonial Slider Functions
function initializeTestimonialSlider() {
  if (testimonialSlides.length === 0) return;

  let currentSlide = 0;
  const totalSlides = testimonialSlides.length;

  function showSlide(index) {
    // Hide all slides
    testimonialSlides.forEach(slide => {
      slide.classList.remove("active");
      slide.style.transform = "translateX(100%)";
    });

    // Hide all dots
    testimonialDots.forEach(dot => dot.classList.remove("active"));

    // Show current slide
    testimonialSlides[index].classList.add("active");
    testimonialSlides[index].style.transform = "translateX(0)";
    testimonialDots[index].classList.add("active");
  }

  function nextSlide() {
    currentSlide = (currentSlide + 1) % totalSlides;
    showSlide(currentSlide);
  }

  function prevSlide() {
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    showSlide(currentSlide);
  }

  // Add click event listeners
  if (prevButton) prevButton.addEventListener("click", prevSlide);
  if (nextButton) nextButton.addEventListener("click", nextSlide);

  // Add click event listeners to dots
  testimonialDots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      currentSlide = index;
      showSlide(currentSlide);
    });
  });

  // Auto-rotate slides every 5 seconds
  setInterval(nextSlide, 5000);

  // Show initial slide
  showSlide(currentSlide);
}
