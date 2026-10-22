const API = '/api';
const state = { movies: [], user: null, authMode: 'login', selectedMovie: null, selectedShowtime: null, selectedSeat: null, ticketPrice: 0 };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const response = await fetch(`${API}${path}`, { ...options, headers, credentials: 'same-origin' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[ch]); }
function formatDate(value) { return new Date(value).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
function money(value) { return `EGP ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`; }
function toast(message, error = false) { const node = $('#toast'); node.textContent = message; node.classList.toggle('error', error); node.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 3200); }
function openModal(id) { $(`#${id}`).classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { $(`#${id}`).classList.add('hidden'); if ($$('.modal-backdrop:not(.hidden)').length === 0) document.body.style.overflow = ''; }
function syncAccount() {
  $('#account-actions').classList.toggle('hidden', !!state.user);
  $('#signed-in-actions').classList.toggle('hidden', !state.user);
  $('#welcome-name').textContent = state.user ? `Hi, ${state.user.name.split(' ')[0]}` : '';
}
function setAuthMode(mode) {
  state.authMode = mode;
  $$('.auth-tab').forEach(button => button.classList.toggle('active', button.dataset.authMode === mode));
  const register = mode === 'register';
  $('#name-field').classList.toggle('hidden', !register);
  $('#auth-name').required = register;
  $('#auth-password').autocomplete = register ? 'new-password' : 'current-password';
  $('#auth-title').innerHTML = register ? 'Make it a <span>movie night.</span>' : 'Your seat is <span>waiting.</span>';
  $('#auth-subtitle').textContent = register ? 'Create an account to reserve seats and keep your bookings in one place.' : 'Log in to book seats and keep track of your movie nights.';
  $('#auth-submit').textContent = register ? 'Create account' : 'Log in';
  $('#auth-message').textContent = '';
}
function showAuth(mode = 'login') { setAuthMode(mode); openModal('auth-modal'); }

async function loadMovies(search = '') {
  $('#movie-status').textContent = 'Finding your next favourite...';
  try {
    const data = await api(`/movies${search ? `?search=${encodeURIComponent(search)}` : ''}`);
    state.movies = data.movies;
    renderMovies();
    $('#movie-status').textContent = `${state.movies.length} movie${state.movies.length === 1 ? '' : 's'} to choose from`;
  } catch (error) {
    $('#movie-status').textContent = error.message;
    $('#movie-grid').innerHTML = '<div class="empty-state"><h3>Could not load movies</h3><p>Check that the API and database are running, then refresh.</p></div>';
  }
}
function renderMovies() {
  const grid = $('#movie-grid');
  if (!state.movies.length) { grid.innerHTML = '<div class="empty-state"><h3>No movies found</h3><p>Try another title or genre.</p></div>'; return; }
  grid.innerHTML = state.movies.map(movie => `<article class="movie-card">
    <div class="poster-wrap"><img src="${escapeHtml(movie.poster_url)}" alt="${escapeHtml(movie.title)} poster" loading="lazy"><div class="poster-overlay"></div><span class="rating-pill">★ ${Number(movie.rating).toFixed(1)}</span></div>
    <div class="movie-info"><span class="movie-meta">${escapeHtml(movie.genre)} · ${movie.release_year}</span><h3>${escapeHtml(movie.title)}</h3><p class="movie-description">${escapeHtml(movie.description)}</p><div class="movie-footer"><span class="movie-duration">◷ ${movie.duration_minutes} min</span><button class="btn btn-primary" data-book-movie="${movie.id}">Choose showtime ↗</button></div></div>
  </article>`).join('');
}
async function chooseMovie(movieId) {
  const movie = state.movies.find(item => Number(item.id) === Number(movieId));
  if (!movie) return;
  state.selectedMovie = movie;
  $('#showtime-title').innerHTML = `Choose a <span>showtime.</span>`;
  $('#showtime-movie-description').textContent = `${movie.title} · ${movie.duration_minutes} minutes`;
  $('#showtime-list').innerHTML = '<p class="status-line">Loading available showtimes...</p>';
  $('#showtime-message').textContent = '';
  openModal('showtime-modal');
  try {
    const data = await api(`/movies/${movie.id}/showtimes`);
    if (!data.showtimes.length) { $('#showtime-list').innerHTML = '<div class="empty-state"><h3>No upcoming showtimes</h3><p>Please check back soon.</p></div>'; return; }
    $('#showtime-list').innerHTML = data.showtimes.map(time => `<button class="showtime-option" data-showtime-id="${time.id}" data-price="${time.ticket_price}"><span><span class="showtime-time">${escapeHtml(formatDate(time.starts_at))}</span><span class="showtime-meta">${escapeHtml(time.screen_name)} · ${Math.max(0, 80 - Number(time.booked_seats))} seats left</span></span><span class="showtime-price">${money(time.ticket_price)}</span></button>`).join('');
  } catch (error) { $('#showtime-list').innerHTML = `<p class="form-message">${escapeHtml(error.message)}</p>`; }
}
async function chooseShowtime(showtimeId, price) {
  state.selectedShowtime = Number(showtimeId); state.ticketPrice = Number(price); state.selectedSeat = null;
  $('#seat-message').textContent = '';
  $('#seats-showtime-info').textContent = `${state.selectedMovie.title} · ${money(price)} per ticket`;
  $('#seat-grid').innerHTML = '<p class="status-line">Checking seat availability...</p>';
  $('#selected-seat-label').textContent = 'Choose a seat'; $('#selected-seat-price').textContent = money(price); $('#confirm-booking').disabled = true;
  closeModal('showtime-modal'); openModal('seats-modal');
  try {
    const data = await api(`/showtimes/${showtimeId}/seats`);
    $('#seat-grid').innerHTML = data.seats.map(seat => `<button class="seat ${seat.booked ? 'booked' : ''}" data-seat="${seat.code}" ${seat.booked ? 'disabled aria-label="Seat '+seat.code+' is taken"' : 'aria-label="Choose seat '+seat.code+'"'}>${seat.code}</button>`).join('');
  } catch (error) { $('#seat-grid').innerHTML = `<p class="form-message">${escapeHtml(error.message)}</p>`; }
}
function selectSeat(code) {
  state.selectedSeat = code;
  $$('.seat').forEach(seat => seat.classList.toggle('selected', seat.dataset.seat === code));
  $('#selected-seat-label').textContent = code;
  $('#selected-seat-price').textContent = money(state.ticketPrice);
  $('#confirm-booking').disabled = false;
}
async function confirmBooking() {
  if (!state.user) { closeModal('seats-modal'); showAuth('login'); toast('Log in first to confirm your booking.'); return; }
  if (!state.selectedSeat || !state.selectedShowtime) return;
  const button = $('#confirm-booking'); button.disabled = true; button.textContent = 'Confirming...'; $('#seat-message').textContent = '';
  try {
    const result = await api('/bookings', { method: 'POST', body: JSON.stringify({ showtimeId: state.selectedShowtime, seatCode: state.selectedSeat }) });
    closeModal('seats-modal'); toast(`Booking confirmed! Your seat is ${result.booking.seatCode}.`); await loadBookings(); $('#my-bookings').scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    $('#seat-message').textContent = error.message;
    if (error.message.toLowerCase().includes('seat') && error.message.toLowerCase().includes('booked')) {
      try { const data = await api(`/showtimes/${state.selectedShowtime}/seats`); $('#seat-grid').innerHTML = data.seats.map(seat => `<button class="seat ${seat.booked ? 'booked' : ''}" data-seat="${seat.code}" ${seat.booked ? 'disabled' : ''}>${seat.code}</button>`).join(''); state.selectedSeat = null; $('#selected-seat-label').textContent = 'Choose a seat'; }
      catch {}
    }
  } finally { button.textContent = 'Confirm booking ↗'; button.disabled = !state.selectedSeat; }
}
async function loadBookings() {
  const content = $('#bookings-content');
  if (!state.user) { content.innerHTML = '<div class="empty-state"><span class="empty-icon">✦</span><h3>Your next movie night starts here</h3><p>Log in to see your bookings, or choose a movie above to get started.</p><button class="btn btn-primary" id="booking-login" class="btn btn-primary empty-action">Log in to view bookings</button></div>'; return; }
  try {
    const data = await api('/bookings/mine');
    if (!data.bookings.length) { content.innerHTML = '<div class="empty-state"><span class="empty-icon">✦</span><h3>No bookings yet</h3><p>Pick a movie, find your seat, and make a night of it.</p><a class="btn btn-primary empty-action" href="#movies">Browse movies</a></div>'; return; }
    content.innerHTML = `<div class="bookings-list">${data.bookings.map(b => `<article class="booking-row"><img class="booking-poster" src="${escapeHtml(b.poster_url)}" alt=""><div><h3>${escapeHtml(b.title)}</h3><p class="booking-detail">${escapeHtml(formatDate(b.starts_at))} · ${escapeHtml(b.screen_name)}</p><p class="booking-detail">Seat ${escapeHtml(b.seat_code)} · ${money(b.ticket_price)}</p><span class="booking-status ${b.status === 'cancelled' ? 'cancelled' : ''}">${escapeHtml(b.status)}</span></div>${b.status === 'confirmed' ? `<button class="cancel-booking" data-cancel-booking="${b.id}">Cancel booking</button>` : ''}</article>`).join('')}</div>`;
  } catch (error) { content.innerHTML = `<div class="empty-state"><h3>Could not load bookings</h3><p>${escapeHtml(error.message)}</p></div>`; }
}
async function cancelBooking(id) {
  if (!confirm('Cancel this booking? The seat will become available again.')) return;
  try { await api(`/bookings/${id}/cancel`, { method: 'PATCH' }); toast('Booking cancelled.'); await loadBookings(); }
  catch (error) { toast(error.message, true); }
}
async function submitAuth(event) {
  event.preventDefault();
  const button = $('#auth-submit'); const message = $('#auth-message'); message.textContent = '';
  const payload = { email: $('#auth-email').value.trim(), password: $('#auth-password').value };
  if (state.authMode === 'register') payload.name = $('#auth-name').value.trim();
  button.disabled = true; button.textContent = state.authMode === 'register' ? 'Creating account...' : 'Logging in...';
  try {
    const result = await api(`/auth/${state.authMode === 'register' ? 'register' : 'login'}`, { method: 'POST', body: JSON.stringify(payload) });
    state.user = result.user;
    syncAccount(); closeModal('auth-modal'); $('#auth-form').reset(); toast(`Welcome${state.user.name ? `, ${state.user.name.split(' ')[0]}` : ''}!`); await loadBookings();
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; button.textContent = state.authMode === 'register' ? 'Create account' : 'Log in'; }
}
async function logout() { await api('/auth/logout', { method: 'POST' }); state.user = null; syncAccount(); loadBookings(); toast('You have logged out.'); }

async function loadSession() {
  localStorage.removeItem('starCinemaToken');
  localStorage.removeItem('starCinemaUser');
  try { state.user = (await api('/auth/me')).user; }
  catch { state.user = null; }
  syncAccount();
  loadBookings();
}

document.addEventListener('click', event => {
  const movieButton = event.target.closest('[data-book-movie]'); if (movieButton) chooseMovie(movieButton.dataset.bookMovie);
  const showtimeButton = event.target.closest('[data-showtime-id]'); if (showtimeButton) chooseShowtime(showtimeButton.dataset.showtimeId, showtimeButton.dataset.price);
  const seatButton = event.target.closest('[data-seat]'); if (seatButton && !seatButton.disabled) selectSeat(seatButton.dataset.seat);
  const closeButton = event.target.closest('[data-close]'); if (closeButton) closeModal(closeButton.dataset.close);
  const authTab = event.target.closest('[data-auth-mode]'); if (authTab) setAuthMode(authTab.dataset.authMode);
  const cancelButton = event.target.closest('[data-cancel-booking]'); if (cancelButton) cancelBooking(cancelButton.dataset.cancelBooking);
  if (event.target.id === 'booking-login') showAuth('login');
  if (event.target.classList.contains('modal-backdrop')) closeModal(event.target.id);
});
$('#login-open').addEventListener('click', () => showAuth('login'));
$('#register-open').addEventListener('click', () => showAuth('register'));
$('#logout-button').addEventListener('click', logout);
$('#auth-form').addEventListener('submit', submitAuth);
$('#confirm-booking').addEventListener('click', confirmBooking);
$('#movie-search').addEventListener('input', (() => { let timer; return event => { clearTimeout(timer); timer = setTimeout(() => loadMovies(event.target.value.trim()), 250); }; })());
document.addEventListener('keydown', event => { if (event.key === 'Escape') $$('.modal-backdrop:not(.hidden)').forEach(modal => closeModal(modal.id)); });
document.addEventListener('error', event => { if (event.target instanceof HTMLImageElement) event.target.style.display = 'none'; }, true);
$('#current-year').textContent = new Date().getFullYear();
loadSession(); loadMovies();
