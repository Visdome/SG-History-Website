// script.js — shared by all three era pages (2000s, 2010s, 2020s)
// Each page sets DATA_FILE and IMAGES before loading this script

// These are used by the modal to know which card is open
var timelineItems = [];
var currentIndex = 0;

// --- STEP 1: Load the JSON data and render the page ---

fetch(DATA_FILE)
  .then(function(response) {
    return response.json();
  })
  .then(function(data) {

    // Basic check that the JSON has the fields we need
    if (!data.title || !data.era || !Array.isArray(data.timeline) || data.timeline.length === 0) {
      document.getElementById('page-content').innerHTML = '<p style="color:red; padding:40px;">Error: JSON data is missing required fields.</p>';
      return;
    }

    // Warn in the console if any timeline item is missing a year or event
    for (var i = 0; i < data.timeline.length; i++) {
      if (!data.timeline[i].year || !data.timeline[i].event) {
        console.warn('Timeline item ' + i + ' is missing year or event');
      }
    }

    // Save the timeline array so the modal can use it later
    timelineItems = data.timeline;

    // Use Mustache to fill in the HTML template with our data
    var rendered = Mustache.render(document.getElementById('tmpl').innerHTML, data);
    document.getElementById('page-content').innerHTML = rendered;

    // Now that the cards are in the DOM, set up the timeline
    setupTimeline();
  })
  .catch(function(error) {
    console.error('Could not load data:', error);
  });


// --- STEP 2: Set up the draggable infinite-loop timeline ---

function setupTimeline() {
  var wrapper = document.getElementById('timeline-wrapper');
  var track = wrapper.querySelector('.timeline-track');

  // Get all the original cards before we start cloning
  var cards = track.querySelectorAll('.tl-item');
  var cardCount = cards.length;

  // Clone all cards and add copies before and after the originals.
  // This creates the illusion of an infinite loop when scrolling.
  for (var i = 0; i < cardCount; i++) {
    var cloneBefore = cards[i].cloneNode(true);
    var cloneAfter  = cards[i].cloneNode(true);
    cloneBefore.setAttribute('data-clone', 'true');
    cloneAfter.setAttribute('data-clone', 'true');
    track.insertBefore(cloneBefore, track.firstChild);
    track.appendChild(cloneAfter);
  }

  var cardWidth = cards[0].offsetWidth;

  // Scroll so the first real card is visible in the centre on load
  wrapper.scrollLeft = (cardCount * cardWidth) - (wrapper.clientWidth / 2) + (cardWidth / 2);

  // --- Drag to scroll (mouse) ---
  var isDragging = false;
  var dragStartX = 0;
  var dragStartScrollLeft = 0;
  var didDrag = false;

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
    var distance = e.clientX - dragStartX;
    if (Math.abs(distance) > 5) didDrag = true;
    wrapper.scrollLeft = dragStartScrollLeft - distance;
  });

  // --- Drag to scroll (touch) ---
  var touchStartX = 0;
  var touchStartScrollLeft = 0;

  wrapper.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartScrollLeft = wrapper.scrollLeft;
  });

  wrapper.addEventListener('touchmove', function(e) {
    var distance = e.touches[0].clientX - touchStartX;
    wrapper.scrollLeft = touchStartScrollLeft - distance;
  });

  // --- Infinite loop + highlight centre card on scroll ---
  wrapper.addEventListener('scroll', function() {
    var allCards = track.querySelectorAll('.tl-item');
    var totalWidth = cardCount * cardWidth;
    var centre = wrapper.scrollLeft + wrapper.clientWidth / 2;

    // If we've scrolled too far right, jump back by one full set of cards
    if (wrapper.scrollLeft >= totalWidth * 2) {
      wrapper.scrollLeft -= totalWidth;
      return;
    }
    // If we've scrolled too far left, jump forward by one full set
    if (wrapper.scrollLeft < totalWidth * 0.5) {
      wrapper.scrollLeft += totalWidth;
      return;
    }

    // Dim all cards, then highlight the one closest to the centre
    var closestIndex = 0;
    var closestDistance = Infinity;
    for (var i = 0; i < allCards.length; i++) {
      var cardCentre = allCards[i].offsetLeft + cardWidth / 2;
      var distance = Math.abs(cardCentre - centre);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }
    for (var i = 0; i < allCards.length; i++) {
      allCards[i].style.opacity = (i === closestIndex) ? '1' : '0.4';
    }
  });

  // Fire scroll once so the first card highlights on load
  setTimeout(function() {
    wrapper.dispatchEvent(new Event('scroll'));
  }, 50);

  // --- Click a card to open the modal ---
  // Only attach listeners to real cards, not clones
  var realCards = track.querySelectorAll('.tl-item:not([data-clone])');
  for (var i = 0; i < realCards.length; i++) {
    // Make cards keyboard-accessible: they're divs acting as buttons
    realCards[i].setAttribute('role', 'button');
    realCards[i].setAttribute('tabindex', '0');
    realCards[i].setAttribute('aria-label', timelineItems[i].year + ': ' + timelineItems[i].event);
    // We use a closure to capture the index at the time of the loop
    realCards[i].addEventListener('click', makeClickHandler(i));
    realCards[i].addEventListener('keydown', makeKeyHandler(i));
  }

  // A simple function that returns a click handler for a given card index.
  // This is needed because if we wrote the listener inline inside the loop,
  // all cards would share the same 'i' variable and open the last card.
  function makeClickHandler(index) {
    return function() {
      if (didDrag) {
        didDrag = false; // ignore click if the user was just dragging
        return;
      }
      openModal(index);
    };
  }

  // Keyboard handler: Enter or Space activates the card, matching button behaviour
  function makeKeyHandler(index) {
    return function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(index);
      }
    };
  }

  // --- Modal controls ---
  document.getElementById('modal-close').addEventListener('click', closeModal);

  // Close if the user clicks the dark backdrop behind the modal
  document.getElementById('modal-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  document.getElementById('modal-prev').addEventListener('click', function() {
    openModal(currentIndex - 1);
  });

  document.getElementById('modal-next').addEventListener('click', function() {
    openModal(currentIndex + 1);
  });

  // Keyboard shortcuts: Escape to close, arrow keys to navigate
  document.addEventListener('keydown', function(e) {
    var overlay = document.getElementById('modal-overlay');
    if (!overlay.classList.contains('visible')) return;
    if (e.key === 'Escape')      closeModal();
    if (e.key === 'ArrowLeft')   openModal(currentIndex - 1);
    if (e.key === 'ArrowRight')  openModal(currentIndex + 1);
  });
}


// --- STEP 3: Open the modal for a given card index ---

function openModal(index) {
  // Don't go past the first or last card
  if (index < 0 || index >= timelineItems.length) return;

  currentIndex = index;
  var item = timelineItems[index];

  // Fill in the modal text
  document.getElementById('modal-year').textContent    = item.year;
  document.getElementById('modal-event').textContent   = item.event;
  document.getElementById('modal-desc').textContent    = item.description;
  document.getElementById('modal-counter').textContent = (index + 1) + ' / ' + timelineItems.length;

  // Disable prev/next buttons at the ends
  document.getElementById('modal-prev').disabled = (index === 0);
  document.getElementById('modal-next').disabled = (index === timelineItems.length - 1);

  // Show the image if one exists for this year, otherwise show the placeholder
  var imgEl     = document.getElementById('modal-img');
  var noImgEl   = document.getElementById('modal-no-img');
  var imagePath = IMAGES[item.year];

  if (imagePath) {
    imgEl.src            = imagePath;
    imgEl.alt            = item.event;
    imgEl.style.display  = 'block';
    noImgEl.style.display = 'none';
  } else {
    imgEl.style.display  = 'none';
    noImgEl.style.display = 'block';
    document.getElementById('modal-img-hint').textContent = 'Add IMAGES["' + item.year + '"] in the HTML to show a photo here';
  }

  // Highlight the active card on the timeline
  var realCards = document.querySelectorAll('.tl-item:not([data-clone])');
  for (var i = 0; i < realCards.length; i++) {
    realCards[i].classList.remove('active');
  }
  realCards[index].classList.add('active');

  // Show the modal and make its buttons focusable
  var overlay = document.getElementById('modal-overlay');
  overlay.classList.add('visible');
  overlay.removeAttribute('aria-hidden');
  // Re-enable tab focus on all modal buttons now that the modal is open
  document.getElementById('modal-close').removeAttribute('tabindex');
  document.getElementById('modal-prev').removeAttribute('tabindex');
  document.getElementById('modal-next').removeAttribute('tabindex');
  // Move focus into the modal so screen readers announce the content
  document.getElementById('modal-close').focus();
}


// --- STEP 4: Close the modal ---

function closeModal() {
  var overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('visible');
  overlay.setAttribute('aria-hidden', 'true');
  // Make modal buttons unfocusable again while the modal is hidden
  document.getElementById('modal-close').setAttribute('tabindex', '-1');
  document.getElementById('modal-prev').setAttribute('tabindex', '-1');
  document.getElementById('modal-next').setAttribute('tabindex', '-1');

  // Remove the active highlight from all cards
  var allCards = document.querySelectorAll('.tl-item');
  for (var i = 0; i < allCards.length; i++) {
    allCards[i].classList.remove('active');
  }
}
