const API = "https://www.themealdb.com/api/json/v1/1/";

let categoriaActual = "";
let recetasActuales = [];

function badgeInfo(nIngredientes) {
  if (nIngredientes <= 6) return { cls: "easy", label: "Fácil" };
  if (nIngredientes <= 9) return { cls: "mid", label: "Intermedio" };
  return { cls: "hard", label: "Difícil" };
}

function contarIngredientes(meal) {
  let c = 0;
  for (let i = 1; i <= 20; i++) {
    if (meal[`strIngredient${i}`] && meal[`strIngredient${i}`].trim()) c++;
  }
  return c;
}

// Categorías (pills de filtro)
function cargarCategorias() {
  const url = API + "categories.php";

  fetch(url)
    .then(respuesta => respuesta.json())
    .then(data => {
      const cont = document.getElementById("categorias");
      cont.innerHTML = "";

      const btnTodas = document.createElement("button");
      btnTodas.className = "pill active";
      btnTodas.dataset.cat = "";
      btnTodas.innerHTML = "Todas";
      cont.appendChild(btnTodas);

      data.categories.forEach(cat => {
        const btn = document.createElement("button");
        btn.className = "pill";
        btn.dataset.cat = cat.strCategory;
        btn.innerHTML = `<img src="${cat.strCategoryThumb}" alt="">${cat.strCategory}`;
        cont.appendChild(btn);
      });

      cont.querySelectorAll(".pill").forEach(pill => {
        pill.addEventListener("click", () => {
          cont.querySelectorAll(".pill").forEach(p => p.classList.remove("active"));
          pill.classList.add("active");
          categoriaActual = pill.dataset.cat;
          document.getElementById("buscar").value = "";
          verCategoria(categoriaActual);
        });
      });
    })
    .catch(error => console.log(error));
}

// Recetas por categoría (o todas)
function verCategoria(cat) {
  const contador = document.getElementById("contador");
  contador.innerHTML = "Cargando recetas…";

  const url = cat ? API + "filter.php?c=" + encodeURIComponent(cat) : API + "search.php?s=";

  fetch(url)
    .then(respuesta => respuesta.json())
    .then(data => renderRecetas(data.meals || []))
    .catch(error => {
      console.log(error);
      contador.innerHTML = "No se pudo conectar con TheMealDB.";
    });
}

// Búsqueda (por nombre de platillo Y por ingrediente)
function buscarRecetas(term) {
  const contador = document.getElementById("contador");
  contador.innerHTML = "Buscando…";

  const urlPorNombre = API + "search.php?s=" + encodeURIComponent(term);
  const urlPorIngrediente = API + "filter.php?i=" + encodeURIComponent(term);

  const buscarPorNombre = fetch(urlPorNombre).then(respuesta => respuesta.json());
  const buscarPorIngrediente = fetch(urlPorIngrediente).then(respuesta => respuesta.json());

  Promise.all([buscarPorNombre, buscarPorIngrediente])
    .then(([resNombre, resIngrediente]) => {
      const mealsPorNombre = resNombre.meals || [];
      const mealsPorIngrediente = resIngrediente.meals || [];

      const idsYaVistos = new Set(mealsPorNombre.map(m => m.idMeal));
      const soloPorIngrediente = mealsPorIngrediente.filter(m => !idsYaVistos.has(m.idMeal));

      if (!soloPorIngrediente.length) {
        renderRecetas(mealsPorNombre);
        return;
      }

      Promise.all(
        soloPorIngrediente.map(m =>
          fetch(API + "lookup.php?i=" + m.idMeal).then(respuesta => respuesta.json())
        )
      )
        .then(detalles => {
          const mealsCompletos = detalles.map(d => d.meals[0]);
          renderRecetas([...mealsPorNombre, ...mealsCompletos]);
        })
        .catch(error => {
          console.log(error);
          renderRecetas(mealsPorNombre);
        });
    })
    .catch(error => {
      console.log(error);
      contador.innerHTML = "No se pudo conectar con TheMealDB.";
    });
}

function renderRecetas(meals) {
  recetasActuales = meals;

  const cont = document.getElementById("recetas");
  const contador = document.getElementById("contador");

  if (!meals.length) {
    cont.innerHTML = "";
    const p = document.createElement("p");
    p.className = "empty";
    p.innerHTML = "No encontramos recetas con esos filtros. Prueba con otro término.";
    cont.appendChild(p);
    contador.innerHTML = "0 recetas encontradas";
    return;
  }

  ordenarYPintar();
}

function ordenarYPintar() {
  const orden = document.getElementById("ordenar").value;
  recetasActuales.sort((a, b) => orden === "za"
    ? b.strMeal.localeCompare(a.strMeal)
    : a.strMeal.localeCompare(b.strMeal));

  const cont = document.getElementById("recetas");
  const contador = document.getElementById("contador");
  contador.innerHTML = `${recetasActuales.length} recetas`;

  cont.innerHTML = "";

  recetasActuales.forEach(meal => {
    const nIng = contarIngredientes(meal);
    const badge = badgeInfo(nIng);

    const card = document.createElement("div");
    card.className = "card";
    card.dataset.id = meal.idMeal;
    card.innerHTML = `
      <div class="card-img">
        <img src="${meal.strMealThumb}" alt="${meal.strMeal}" loading="lazy">
        <span class="badge ${badge.cls}">${badge.label}</span>
      </div>
      <div class="card-body">
        <h3>${meal.strMeal}</h3>
        <span class="cat-tag">${meal.strCategory || categoriaActual || "Receta"}</span>
        <div class="card-meta">
          <span>🥘 ${nIng || "—"} ingredientes</span>
          <span>🌍 ${meal.strArea || "—"}</span>
        </div>
      </div>`;

    card.addEventListener("click", () => verDetalle(card.dataset.id));
    cont.appendChild(card);
  });
}

// Modal de detalle
function verDetalle(id) {
  const modal = document.getElementById("modal");
  modal.innerHTML = `<p class="empty">Cargando receta…</p>`;
  document.getElementById("overlay").classList.add("open");

  const url = API + "lookup.php?i=" + id;

  fetch(url)
    .then(respuesta => respuesta.json())
    .then(data => {
      const meal = data.meals[0];

      const filasIngredientes = [];
      for (let i = 1; i <= 20; i++) {
        const ing = meal[`strIngredient${i}`];
        const medida = meal[`strMeasure${i}`];
        if (ing && ing.trim()) {
          filasIngredientes.push(`<li><b>${ing.trim()}</b><span>${(medida || "").trim()}</span></li>`);
        }
      }

      modal.innerHTML = "";

      const imgWrap = document.createElement("div");
      imgWrap.className = "modal-img";
      imgWrap.innerHTML = `
        <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
        <button class="modal-close" id="cerrarModal">✕</button>`;
      modal.appendChild(imgWrap);

      const body = document.createElement("div");
      body.className = "modal-body";
      body.innerHTML = `
        <h2>${meal.strMeal}</h2>
        <span class="cat-tag">${meal.strCategory} · ${meal.strArea}</span>
        <div class="modal-section-title">Ingredientes</div>
        <ul class="ingredients">${filasIngredientes.join("")}</ul>
        <div class="modal-section-title">Preparación</div>
        <div class="instructions">${meal.strInstructions}</div>
        <div class="modal-links">
          ${meal.strYoutube ? `<a href="${meal.strYoutube}" target="_blank" rel="noopener">Ver video en YouTube ↗</a>` : ""}
          ${meal.strSource ? `<a href="${meal.strSource}" target="_blank" rel="noopener">Fuente original ↗</a>` : ""}
        </div>`;
      modal.appendChild(body);

      document.getElementById("cerrarModal").addEventListener("click", cerrarModal);
    })
    .catch(error => console.log(error));
}

function cerrarModal() {
  document.getElementById("overlay").classList.remove("open");
}

document.getElementById("overlay").addEventListener("click", e => {
  if (e.target.id === "overlay") cerrarModal();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") cerrarModal();
});

// Eventos de búsqueda y orden
let temporizadorBusqueda;
document.getElementById("buscar").addEventListener("input", e => {
  clearTimeout(temporizadorBusqueda);
  const valor = e.target.value.trim();
  temporizadorBusqueda = setTimeout(() => {
    if (valor) buscarRecetas(valor);
    else verCategoria(categoriaActual);
  }, 350);
});

document.getElementById("ordenar").addEventListener("change", () => {
  if (recetasActuales.length) ordenarYPintar();
});

cargarCategorias();
verCategoria("");