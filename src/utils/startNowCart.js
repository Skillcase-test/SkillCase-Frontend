const CART_STORAGE_KEY = "skillcase_start_now_cart";
const CART_CHANGED_EVENT = "startnow-cart-changed";

export function getCartIds() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Error reading start-now cart from localStorage:", err);
    return [];
  }
}

function setCartIds(ids) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT));
}

export function isInCart(id) {
  return getCartIds().includes(id);
}

export function toggleCartItem(id) {
  const current = getCartIds();
  const next = current.includes(id)
    ? current.filter((itemId) => itemId !== id)
    : [...current, id];
  setCartIds(next);
  return next;
}

export function clearCart() {
  setCartIds([]);
}

export function onCartChanged(callback) {
  window.addEventListener(CART_CHANGED_EVENT, callback);
  return () => window.removeEventListener(CART_CHANGED_EVENT, callback);
}

export function formatInr(pricePaise) {
  return `₹${Math.round((pricePaise || 0) / 100).toLocaleString("en-IN")}`;
}

export { CART_CHANGED_EVENT };
