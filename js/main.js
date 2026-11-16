/* ===== Patrik Lunch: бронь стола, меню, заказ ===== */

// Первые три позиции — с карточки на Яндекс Картах, остальные примерные: заменить на актуальное меню.
const MENU = [
  { id: "cheese", cat: "Закуски", name: "Тарелка четырёх сыров", meta: "220 г", price: 1100 },
  { id: "salmon", cat: "Закуски", name: "Тартар из лосося", meta: "165 г", price: 950 },
  { id: "tartar", cat: "Закуски", name: "Тартар с чиабаттой", meta: "155 г", price: 750 },
  { id: "brus", cat: "Закуски", name: "Брускетты ассорти", meta: "3 шт.", price: 590 },

  { id: "caesar", cat: "Горячее и салаты", name: "Цезарь с курицей", meta: "240 г", price: 620 },
  { id: "carbo", cat: "Горячее и салаты", name: "Паста карбонара", meta: "280 г", price: 690 },
  { id: "risotto", cat: "Горячее и салаты", name: "Ризотто с белыми грибами", meta: "260 г", price: 720 },
  { id: "tiramisu", cat: "Горячее и салаты", name: "Тирамису", meta: "150 г", price: 420 },
  { id: "capp", cat: "Горячее и салаты", name: "Капучино с собой", meta: "0,3 л", price: 220 }
];

// Часы для брони (уточнить у заведения).
const RESERVE_FROM = 12;
const RESERVE_TO = 21.5;
const STORAGE_KEY = "patrik-cart";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const rub = (n) => n.toLocaleString("ru-RU") + " ₽";
const byId = (id) => MENU.find((d) => d.id === id);

/* ----- Общие помощники ----- */

function formatPhone(value) {
  let d = value.replace(/\D/g, "");
  if (d.startsWith("8")) d = "7" + d.slice(1);
  if (!d.startsWith("7")) d = "7" + d;
  d = d.slice(0, 11);

  const p = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
  let out = "+7";
  if (p[0]) out += " " + p[0];
  if (p[1]) out += " " + p[1];
  if (p[2]) out += "-" + p[2];
  if (p[3]) out += "-" + p[3];
  return out;
}

const phoneOk = (input) => input.value.replace(/\D/g, "").length === 11;

function localDate(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// Здесь подключается приём заявок (например, Telegram-бот через свой сервер).
async function send(type, data) {
  console.log(type, data);
  return new Promise((resolve) => setTimeout(resolve, 500));
}

/* ----- Бронь стола ----- */

let guests = 2;

function fillTimes() {
  const dateInput = $("[data-date]");
  const select = $("[data-time]");
  const now = new Date();
  const isToday = dateInput.value === localDate(now);
  const nowHours = now.getHours() + now.getMinutes() / 60 + 1;

  const options = [];
  for (let h = RESERVE_FROM; h <= RESERVE_TO; h += 0.5) {
    if (isToday && h < nowHours) continue;
    const hh = String(Math.floor(h)).padStart(2, "0");
    options.push(`${hh}:${h % 1 ? "30" : "00"}`);
  }

  select.innerHTML = options.length
    ? `<option value="">Выберите</option>` + options.map((o) => `<option>${o}</option>`).join("")
    : `<option value="">На сегодня мест нет — выберите другой день</option>`;
}

function initDate() {
  const input = $("[data-date]");
  const now = new Date();
  const max = new Date();
  max.setDate(max.getDate() + 60);
  input.min = localDate(now);
  input.max = localDate(max);

  // Если сегодня бронировать уже поздно — по умолчанию завтра.
  const start = new Date();
  if (now.getHours() + 1 > RESERVE_TO) start.setDate(start.getDate() + 1);
  input.value = localDate(start);
  fillTimes();
}

async function submitReserve(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const error = $("[data-reserve-error]");
  const fields = [form.date, form.time, form.name, form.phone];

  fields.forEach((f) => f.classList.remove("is-invalid"));
  const bad = fields.filter((f) => !f.value.trim());
  if (!bad.includes(form.phone) && !phoneOk(form.phone)) bad.push(form.phone);

  if (bad.length) {
    bad.forEach((f) => f.classList.add("is-invalid"));
    error.textContent = "Заполните дату, время, имя и телефон — в номере 10 цифр после +7.";
    bad[0].focus();
    return;
  }

  error.textContent = "";
  const btn = $("button[type=submit]", form);
  btn.disabled = true;
  btn.textContent = "Отправляем…";

  const date = new Date(form.date.value + "T00:00:00").toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "long"
  });
  const data = {
    date,
    time: form.time.value,
    guests,
    name: form.name.value.trim(),
    phone: form.phone.value,
    comment: form.comment.value.trim()
  };
  await send("Бронь стола:", data);

  btn.disabled = false;
  btn.textContent = "Забронировать стол";
  form.hidden = true;
  $("[data-reserve-text]").textContent =
    `${data.date}, ${data.time}, гостей: ${data.guests}. Позвоним на ${data.phone}, чтобы подтвердить.`;
  $("[data-reserve-done]").hidden = false;
}

function reserveAgain() {
  const form = $("[data-reserve]");
  form.reset();
  guests = 2;
  $("[data-guests-out]").textContent = guests;
  initDate();
  form.hidden = false;
  $("[data-reserve-done]").hidden = true;
}

/* ----- Меню и корзина ----- */

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveCart() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch (e) {
    /* без хранилища корзина живёт до перезагрузки */
  }
}

let cart = loadCart();

function qty(id, q) {
  return `
    <div class="qty">
      <button type="button" data-dec="${id}" aria-label="Убрать одну">−</button>
      <span>${q}</span>
      <button type="button" data-inc="${id}" aria-label="Добавить ещё">+</button>
    </div>`;
}

function renderMenu() {
  const cats = [...new Set(MENU.map((d) => d.cat))];
  $("[data-menu]").innerHTML = cats
    .map(
      (cat) => `
      <div>
        <h3 class="menu__cat">${cat}</h3>
        ${MENU.filter((d) => d.cat === cat)
          .map((d) => {
            const q = cart[d.id] || 0;
            const ctrl = q
              ? qty(d.id, q)
              : `<button class="add" type="button" data-inc="${d.id}" aria-label="Добавить: ${d.name}">+</button>`;
            return `
            <div class="dish">
              <span class="dish__name">${d.name}</span>
              <span class="dish__meta">${d.meta}</span>
              <span class="dish__price">${rub(d.price)}</span>
              <div class="dish__ctrl">${ctrl}</div>
            </div>`;
          })
          .join("")}
      </div>`
    )
    .join("");
}

const entries = () => Object.entries(cart).filter(([id, q]) => q > 0 && byId(id));
const total = () => entries().reduce((s, [id, q]) => s + byId(id).price * q, 0);

function renderCart() {
  const list = entries();
  $("[data-cart-count]").textContent = list.reduce((s, [, q]) => s + q, 0);
  $("[data-cart-total]").textContent = rub(total());
  $("[data-cart-empty]").hidden = list.length > 0;
  $("[data-order]").hidden = list.length === 0;
  $("[data-cart-list]").innerHTML = list
    .map(([id, q]) => {
      const d = byId(id);
      return `
        <li class="cart__item">
          <span>${d.name}</span>
          <span class="cart__sum">${rub(d.price * q)}</span>
          ${qty(id, q)}
        </li>`;
    })
    .join("");
}

function change(id, delta) {
  cart[id] = Math.max(0, (cart[id] || 0) + delta);
  if (!cart[id]) delete cart[id];
  saveCart();
  renderMenu();
  renderCart();
}

function openCart() {
  $("[data-cart]").classList.add("is-open");
  $("[data-cart]").setAttribute("aria-hidden", "false");
  $(".overlay").hidden = false;
  $(".cart__close").focus();
}

function closeCart() {
  $("[data-cart]").classList.remove("is-open");
  $("[data-cart]").setAttribute("aria-hidden", "true");
  $(".overlay").hidden = true;
  if (!$("[data-cart-done]").hidden) {
    $("[data-cart-done]").hidden = true;
    $("[data-cart-body]").hidden = false;
  }
}

function syncMode() {
  const delivery = $("[name=mode]:checked").value === "Доставка";
  $("[data-address]").hidden = !delivery;
}

async function submitOrder(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const error = $("[data-order-error]");
  const delivery = form.mode.value === "Доставка";
  const fields = [form.name, form.phone].concat(delivery ? [form.address] : []);

  fields.forEach((f) => f.classList.remove("is-invalid"));
  const bad = fields.filter((f) => !f.value.trim());
  if (!bad.includes(form.phone) && !phoneOk(form.phone)) bad.push(form.phone);

  if (bad.length) {
    bad.forEach((f) => f.classList.add("is-invalid"));
    error.textContent = bad.includes(form.address)
      ? "Укажите адрес доставки."
      : "Проверьте имя и телефон: 10 цифр после +7.";
    bad[0].focus();
    return;
  }

  error.textContent = "";
  const btn = $("button[type=submit]", form);
  btn.disabled = true;
  btn.textContent = "Отправляем…";

  await send("Заказ:", {
    items: entries().map(([id, q]) => ({ name: byId(id).name, qty: q, price: byId(id).price })),
    total: total(),
    mode: form.mode.value,
    address: form.address.value.trim(),
    name: form.name.value.trim(),
    phone: form.phone.value,
    comment: form.comment.value.trim()
  });

  cart = {};
  saveCart();
  form.reset();
  syncMode();
  btn.disabled = false;
  btn.textContent = "Отправить заказ";
  renderMenu();
  renderCart();
  $("[data-cart-body]").hidden = true;
  $("[data-cart-done]").hidden = false;
}

/* ----- События ----- */

document.addEventListener("click", (e) => {
  const inc = e.target.closest("[data-inc]");
  const dec = e.target.closest("[data-dec]");
  const g = e.target.closest("[data-guests]");

  if (inc) change(inc.dataset.inc, 1);
  if (dec) change(dec.dataset.dec, -1);
  if (g) {
    guests = Math.min(12, Math.max(1, guests + Number(g.dataset.guests)));
    $("[data-guests-out]").textContent = guests;
  }
  if (e.target.closest("[data-cart-open]")) openCart();
  if (e.target.closest("[data-cart-close]")) closeCart();
  if (e.target.closest("[data-reserve-again]")) reserveAgain();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeCart();
});

$$("[data-phone]").forEach((input) =>
  input.addEventListener("input", () => {
    input.value = formatPhone(input.value);
  })
);

$("[data-date]").addEventListener("change", fillTimes);
$$("[name=mode]").forEach((r) => r.addEventListener("change", syncMode));
$("[data-reserve]").addEventListener("submit", submitReserve);
$("[data-order]").addEventListener("submit", submitOrder);

initDate();
renderMenu();
renderCart();
syncMode();
