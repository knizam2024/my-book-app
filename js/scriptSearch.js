//----------------------------------------------------
//  CONTROLS
//----------------------------------------------------
const searchText = document.getElementById("searchText");
const searchButton = document.getElementById("searchButton");
const numberBooksDisplayValue = document.getElementById(
  "numberBooksDisplayValue"
);
const numberBooksRange = document.getElementById("numberBooksRange");
const booksDisplayContainer = document.getElementById("booksDisplayContainer");
const getNewest = document.getElementById("getNewest");
const getEBooks = document.getElementById("getEBooks");
const getFree = document.getElementById("getFree");
const booksRangeWrapper = document.getElementById("booksRangeWrapper");

let cachedBooks = [];

//----------------------------------------------------
// HELPER FUNCTIONS
//----------------------------------------------------

//Sort by newest
function sortByPublishedDateDesc(books) {
  return books.sort((a, b) => {
    const yearA = parseInt((a.publishedDate || "0").substring(0, 4), 10);
    const yearB = parseInt((b.publishedDate || "0").substring(0, 4), 10);
    return yearB - yearA;
  });
}

//Format Date only Year
function formatPublishedDate(dateStr) {
  if (!dateStr) return "N/A";
  return dateStr.substring(0, 4);
}

//Render rating starts
function renderStars(rating = 0) {
  const fullStar = "★";
  const emptyStar = "☆";
  const maxStars = 5;

  const filled = Math.round(rating); // round to nearest
  return fullStar.repeat(filled) + emptyStar.repeat(maxStars - filled);
}

//Disable control panel
function setControlsDisabled(disabled) {
  searchText.disabled = disabled;
  numberBooksRange.disabled = disabled;
  getNewest.disabled = disabled;
  getEBooks.disabled = disabled;
  getFree.disabled = disabled;
  searchButton.disabled = disabled;
}

function getBooksRange() {
  return parseInt(numberBooksRange.value, 10) || 5;
}

//----------------------------------------------------
// RENDER
//----------------------------------------------------
function generateBookDisplay(books) {
  booksDisplayContainer.innerHTML = "";

  if (!books || books.length === 0) {
    booksDisplayContainer.innerHTML = `<div class="col-12 text-muted">No books found</div>`;
    return;
  }

  books.forEach((book) => {
    const col = document.createElement("div");
    col.className = "col-sm-6 col-md-4 col-lg-3";

    col.innerHTML = `
      <div class="card book-card h-100">
        <img src="${book.cover}" class="card-img-top" alt="${book.title}" />
        <div class="card-body">
          <h5 class="card-title">${book.title}</h5>
          <p class="card-text mb-1"><small class="text-muted">By ${
            book.author
          }</small></p>
          <p class="card-text"><strong>${book.currency} ${
      book.price
    }</strong></p>
    <p><strong>Published:</strong> ${formatPublishedDate(
      book.publishedDate
    )}</p>

     ${
       book.averageRating
         ? `<p class="mb-1 text-warning">
           ${renderStars(book.averageRating)}
           <small class="text-muted">(${book.ratingsCount})</small>
         </p>`
         : ""
     }
           <div>
    ${book.free ? '<span class="badge bg-primary me-1">Free</span>' : ""}
    ${
      book.epub ? '<span class="badge bg-info text-dark me-1">eBook</span>' : ""
    }
    ${book.pdf ? '<span class="badge bg-success me-1">PDF</span>' : ""}
    ${
      book.popular ? '<span class="badge bg-secondary me-1">Popular</span>' : ""
    }
    ${
      book.bestSeller
        ? '<span class="badge bg-warning text-dark me-1">Best Seller</span>'
        : ""
    }
  </div>
        </div>
      </div>
    `;

    booksDisplayContainer.appendChild(col);
  });
}

function updateSliderMax(max) {
  numberBooksRange.max = max;
  numberBooksRange.value = max;
  numberBooksDisplayValue.textContent = max;
}

//----------------------------------------------------
// API
//----------------------------------------------------
async function getBooksFromAPI(
  searchText,
  limit = 5,
  newest = false,
  onlyFree = false,
  onlyEbooks = false
) {
  let books = [];
  let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
    searchText
  )}&maxResults=${limit}`;

  if (newest) url += "&orderBy=newest";
  if (onlyFree) url += "&filter=free-ebooks";
  else if (onlyEbooks) url += "&filter=ebooks";

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.items || data.items.length === 0) return [];

    books = data.items.map((item) => {
      const info = item.volumeInfo || {};
      const access = item.accessInfo || {};
      const sale = item.saleInfo || {};

      // Start building book object
      const book = {
        title: info.title || "Untitled",
        author: info.authors ? info.authors.join(", ") : "Unknown",
        cover:
          info.imageLinks?.thumbnail ||
          "https://placehold.co/150x220?text=No+Cover",
      };

      if (sale.listPrice) {
        book.currency = sale.listPrice.currencyCode;
        book.price = sale.listPrice.amount;
      } else {
        book.currency = "";
        book.price = "N/A";
      }

      //TODO: in HTML/CSS - Push all tags to the bottom to have same alignment for all cards
      if (access.pdf?.isAvailable) book.pdf = true;
      if (access.epub?.isAvailable) book.epub = true;
      if (sale.saleability === "FREE") book.free = true;

      const ratings = info.ratingsCount || 0;
      const avgRating = info.averageRating || 0;

      if (ratings >= 100) book.popular = true;
      if (avgRating >= 4.5 && ratings >= 500) book.bestSeller = true;
      if (ratings) {
        book.averageRating = avgRating;
        book.ratingsCount = ratings;
      }

      if (info.publishedDate) book.publishedDate = info.publishedDate;

      return book;
    });
  } catch (err) {
    console.log("Error fetching books:", err);
  }

  return books;
}

//----------------------------------------------------
// EVENT HANDLERS
//----------------------------------------------------

//eBooks toggle enable/disable Free toggle
getEBooks.addEventListener("change", function () {
  if (this.checked) {
    getFree.disabled = false;
  } else {
    getFree.checked = false;
    getFree.disabled = true;
  }
});

// Search button click
//TODO: Input focus + <Enter> key will trigger search event too
searchButton.addEventListener("click", async () => {
  const searchTitle = searchText.value.toLowerCase();

  if (!searchTitle) {
    alert("Please enter your search term!");
    return;
  }

  document.getElementById("loadingSpinner").classList.remove("d-none");
  setControlsDisabled(true);

  try {
    cachedBooks = await getBooksFromAPI(
      searchTitle,
      40,
      getNewest.checked,
      getFree.checked,
      getEBooks.checked
    );

    if (cachedBooks.length > 0) {
      if (getNewest.checked) {
        cachedBooks = sortByPublishedDateDesc(cachedBooks);
      }
      updateSliderMax(cachedBooks.length);
      generateBookDisplay(cachedBooks.slice(0, getBooksRange()));
      booksRangeWrapper.classList.remove("d-none");
    } else {
      generateBookDisplay([]);
      booksRangeWrapper.classList.add("d-none");
    }
  } finally {
    document.getElementById("loadingSpinner").classList.add("d-none");
    setControlsDisabled(false);
  }
});

// Slider controls how many books displayed
numberBooksRange.addEventListener("input", () => {
  numberBooksDisplayValue.textContent = numberBooksRange.value;
  generateBookDisplay(cachedBooks.slice(0, getBooksRange()));
});

//----------------------------------------------------
// INITIAL LOAD
//----------------------------------------------------
// Slider disabled until cards are loaded, then only can choose how many displayed
numberBooksRange.disabled = true;
numberBooksDisplayValue.textContent = "";
getFree.disabled = true;
