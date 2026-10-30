// Fetch products from your JSON file
fetch('products.json')
  .then(response => response.json())
  .then(products => {
    renderProducts(products);
  })
  .catch(error => {
    console.error('Error loading products:', error);
    document.getElementById('product-grid').innerHTML = '<p>Could not load products.</p>';
  });

function renderProducts(products) {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = ''; 

  products.forEach(product => {
    // Find the product image
    let imageUrl = 'logo-mark.png';
    if (product.image) imageUrl = product.image;
    if (product.media && product.media.length > 0) imageUrl = product.media[0].src;

    // Build the card
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${imageUrl}" alt="${product.title}" loading="lazy">
      <div class="card-info">
        <h3>${product.title}</h3>
        <p>${product.brand || 'Faux Swiss'}</p>
      </div>
    `;
    grid.appendChild(card);
  });
}
