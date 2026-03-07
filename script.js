// script.js - used by all three era pages
// each page sets DATA_FILE and IMAGES before loading this script

// keep track of which timeline item the modal is showing
let timelineItems = [];
let currentIndex = 0;

// load the json file and render the page
fetch(DATA_FILE)
  .then(function(response) {
    return response.json();
  })
  .then(function(data) {

    // check the json has everything we need before trying to render
    let errors = [];

    if (!data.title || !data.era) errors.push('missing title or era');
    if (!Array.isArray(data.timeline) || data.timeline.length === 0) errors.push('timeline is missing or empty');
    if (!Array.isArray(data.keyStats) || data.keyStats.length === 0) errors.push('keyStats is missing or empty');
    if (!Array.isArray(data.gamingHighlights) || data.gamingHighlights.length === 0) errors.push('gamingHighlights is missing or empty');
    if (!Array.isArray(data.challenges) || data.challenges.length === 0) errors.push('challenges is missing or empty');

    if (errors.length > 0) {
      document.getElementById('page-content').innerHTML = '<p style="color:red; padding:40px;">Error: ' + errors.join(', ') + '</p>';
      return;
    }

    // warn in the console if any timeline item is missing fields
    for (let i = 0; i < data.timeline.length; i++) {
      if (!data.timeline[i].year || !data.timeline[i].event) {
        console.warn('timeline item ' + i + ' is missing year or event');
      }
    }

    // also check keyStats items have value and label
    for (let i = 0; i < data.keyStats.length; i++) {
      if (!data.keyStats[i].value || !data.keyStats[i].label) {
        console.warn('keyStats item ' + i + ' is missing value or label');
      }
    }

    timelineItems = data.timeline;

    // render the mustache template with the data
    let rendered = Mustache.render(document.getElementById('tmpl').innerHTML, data);
    document.getElementById('page-content').innerHTML = rendered;

    setupTimeline();
  })
  .catch(function(error) {
    console.error('could not load data:', error);
  });


// sets up the draggable timeline after the cards are in the DOM
function setupTimeline() {
  let wrapper = document.getElementById('timeline-wrapper');
  let track = wrapper.querySelector('.timeline-track');

  let cards = track.querySelectorAll('.tl-item');
  let cardCount = cards.length;

  // clone all cards before and after so it loops infinitely
  for (let i = 0; i < cardCount; i++) {
    let cloneBefore = cards[i].cloneNode(true);
    let cloneAfter = cards[i].cloneNode(true);
    cloneBefore.setAttribute('data-clone', 'true');
    cloneAfter.setAttribute('data-clone', 'true');
    track.insertBefore(cloneBefore, track.firstChild);
    track.appendChild(cloneAfter);
  }

  let cardWidth = cards[0].offsetWidth;

  // start scrolled to the first real card
  wrapper.scrollLeft = (cardCount * cardWidth) - (wrapper.clientWidth / 2) + (cardWidth / 2);

  // mouse drag
  let isDragging = false;
  let dragStartX = 0;
  let dragStartScrollLeft = 0;
  let didDrag = false;

  wrapper.addEventListener('mousedown', function(e) {
    isDragging = true;
    didDrag = false;
    dragStartX = e.clientX;
    dragStartScrollLeft = wrapper.scrollLeft;
    wrapper.style.cursor = 'grabbing';
  });

  window.addEventListener('mouseup', function() {
    isDragging = false;
    wrapper.style.cursor = 'grab';
  });

  window.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    let distance = e.clientX - dragStartX;
    if (Math.abs(distance) > 5) didDrag = true;
    wrapper.scrollLeft = dragStartScrollLeft - distance;
  });

  // touch drag
  let touchStartX = 0;
  let touchStartScrollLeft = 0;

  wrapper.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartScrollLeft = wrapper.scrollLeft;
  });

  wrapper.addEventListener('touchmove', function(e) {
    let distance = e.touches[0].clientX - touchStartX;
    wrapper.scrollLeft = touchStartScrollLeft - distance;
  });

  // infinite loop scroll + highlight the centre card
  wrapper.addEventListener('scroll', function() {
    let allCards = track.querySelectorAll('.tl-item');
    let totalWidth = cardCount * cardWidth;
    let centre = wrapper.scrollLeft + wrapper.clientWidth / 2;

    // jump scroll position to create the loop effect
    if (wrapper.scrollLeft >= totalWidth * 2) {
      wrapper.scrollLeft -= totalWidth;
      return;
    }
    if (wrapper.scrollLeft < totalWidth * 0.5) {
      wrapper.scrollLeft += totalWidth;
      return;
    }

    // find which card is closest to the centre and highlight it
    let closestIndex = 0;
    let closestDistance = Infinity;
    for (let i = 0; i < allCards.length; i++) {
      let cardCentre = allCards[i].offsetLeft + cardWidth / 2;
      let distance = Math.abs(cardCentre - centre);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }
    for (let i = 0; i < allCards.length; i++) {
      allCards[i].style.opacity = (i === closestIndex) ? '1' : '0.6';
    }
  });

  // trigger scroll once on load so the first card is highlighted
  setTimeout(function() {
    wrapper.dispatchEvent(new Event('scroll'));
  }, 50);

  // add click listeners to real cards only (not clones)
  let realCards = track.querySelectorAll('.tl-item:not([data-clone])');
  for (let i = 0; i < realCards.length; i++) {
    realCards[i].setAttribute('role', 'button');
    realCards[i].setAttribute('tabindex', '0');
    realCards[i].setAttribute('aria-label', timelineItems[i].year + ': ' + timelineItems[i].event);
    realCards[i].addEventListener('click', makeClickHandler(i));
    realCards[i].addEventListener('keydown', makeKeyHandler(i));
  }

  // need a separate function here so each card captures its own index
  // if we did this inline all cards would end up with the last value of i
  function makeClickHandler(index) {
    return function() {
      if (didDrag) {
        didDrag = false;
        return;
      }
      openModal(index);
    };
  }
  // also add keyboard accessibility for Enter and Space keys to open the modal
  function makeKeyHandler(index) {
    return function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(index);
      }
    };
  }

  // modal open/close/nav buttons
  document.getElementById('modal-close').addEventListener('click', closeModal);

  document.getElementById('modal-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  document.getElementById('modal-prev').addEventListener('click', function() {
    openModal(currentIndex - 1);
  });

  document.getElementById('modal-next').addEventListener('click', function() {
    openModal(currentIndex + 1);
  });

  // keyboard shortcuts for the modal
  document.addEventListener('keydown', function(e) {
    let overlay = document.getElementById('modal-overlay');
    if (!overlay.classList.contains('visible')) return;
    if (e.key === 'Escape')     closeModal();
    if (e.key === 'ArrowLeft')  openModal(currentIndex - 1);
    if (e.key === 'ArrowRight') openModal(currentIndex + 1);
  });
}


// opens the modal and fills it with the data for the clicked card
function openModal(index) {
  if (index < 0 || index >= timelineItems.length) return;

  currentIndex = index;
  let item = timelineItems[index];

  document.getElementById('modal-year').textContent    = item.year;
  document.getElementById('modal-event').textContent   = item.event;
  document.getElementById('modal-desc').textContent    = item.description;
  document.getElementById('modal-counter').textContent = (index + 1) + ' / ' + timelineItems.length;

  document.getElementById('modal-prev').disabled = (index === 0);
  document.getElementById('modal-next').disabled = (index === timelineItems.length - 1);

  // show image if there is one for this year, otherwise show the placeholder
  let imgEl     = document.getElementById('modal-img');
  let noImgEl   = document.getElementById('modal-no-img');
  let imagePath = IMAGES[item.year];

  if (imagePath) {
    imgEl.src             = imagePath;
    imgEl.alt             = item.event;
    imgEl.style.display   = 'block';
    noImgEl.style.display = 'none';
  } else {
    imgEl.style.display   = 'none';
    noImgEl.style.display = 'block';
    document.getElementById('modal-img-hint').textContent = 'Add IMAGES["' + item.year + '"] in the HTML to show a photo here';
  }

  // highlight the active card
  let realCards = document.querySelectorAll('.tl-item:not([data-clone])');
  for (let i = 0; i < realCards.length; i++) {
    realCards[i].classList.remove('active');
  }
  realCards[index].classList.add('active');

  let overlay = document.getElementById('modal-overlay');
  overlay.classList.add('visible');
  overlay.removeAttribute('aria-hidden');
  document.getElementById('modal-close').removeAttribute('tabindex');
  document.getElementById('modal-prev').removeAttribute('tabindex');
  document.getElementById('modal-next').removeAttribute('tabindex');
  document.getElementById('modal-close').focus();
}


// closes the modal and resets everything
function closeModal() {
  let overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('visible');
  overlay.setAttribute('aria-hidden', 'true');
  document.getElementById('modal-close').setAttribute('tabindex', '-1');
  document.getElementById('modal-prev').setAttribute('tabindex', '-1');
  document.getElementById('modal-next').setAttribute('tabindex', '-1');

  let allCards = document.querySelectorAll('.tl-item');
  for (let i = 0; i < allCards.length; i++) {
    allCards[i].classList.remove('active');
  }
}
