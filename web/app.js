// Frontend JS para consumir el backend de películas
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api'
  : 'https://emladis-backend.onrender.com/api';
let token = localStorage.getItem('token') || '';

const moviesContainer = document.getElementById('movies-container');
const videoModal = document.getElementById('video-modal');
const closeModalButton = document.getElementById('close-modal');
let moviePlayer = null;
let vjsPlayer = null;
const modalTitle = document.getElementById('modal-title');
const modalDescription = document.getElementById('modal-description');
const downloadLink = document.getElementById('download-link');

const authSection = document.getElementById('auth-section');
const uploadSection = document.getElementById('upload-section');
const adminSection = document.getElementById('admin-section');

function showAuthSection() {
  authSection.innerHTML = '';
  uploadSection.innerHTML = '';
  adminSection.innerHTML = '';
  if (token) {
    // Decodificar el token para saber si es admin
    let username = '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      username = payload.username;
    } catch {}
    const logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Cerrar sesión';
    logoutBtn.className = 'bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded';
    logoutBtn.onclick = () => {
      localStorage.removeItem('token');
      token = '';
      location.reload();
    };
    authSection.appendChild(logoutBtn);
    // Si es admin, mostrar formulario de subida y gestión de usuarios
    if (username === 'admin') {
      // Formulario de subida
      const form = document.createElement('form');
      form.className = 'flex gap-2 items-center';
      form.innerHTML = `
        <input type="file" name="movie" accept="video/mp4" class="bg-slate-700 text-white rounded p-2" required />
        <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded">Subir película</button>
      `;
      form.onsubmit = async (e) => {
        e.preventDefault();
        const fileInput = form.querySelector('input[type="file"]');
        if (!fileInput.files.length) return;
        const formData = new FormData();
        formData.append('movie', fileInput.files[0]);
        try {
          const res = await fetch(API_URL + '/movies/upload', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token },
            body: formData
          });
          const data = await res.json();
          if (res.ok) {
            alert('Película subida correctamente');
            fetchMovies();
            form.reset();
          } else {
            alert(data.error || 'Error al subir película');
          }
        } catch (err) {
          alert('Error de red');
        }
      };
      uploadSection.appendChild(form);
      // Gestión de usuarios pendientes
      const pendingDiv = document.createElement('div');
      pendingDiv.className = 'bg-slate-800 p-4 rounded shadow mt-4';
      pendingDiv.innerHTML = '<h3 class="text-lg font-bold mb-2 text-white">Usuarios pendientes</h3><div id="pending-list" class="flex flex-col gap-2"></div>';
      adminSection.appendChild(pendingDiv);
      fetchPendingUsers();
    }
  } else {
    const loginBtn = document.createElement('button');
    loginBtn.textContent = 'Iniciar sesión';
    loginBtn.className = 'bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded';
    loginBtn.onclick = showLoginModal;
    authSection.appendChild(loginBtn);
    // Formulario de registro
    const registerBtn = document.createElement('button');
    registerBtn.textContent = 'Crear cuenta';
    registerBtn.className = 'bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded';
    registerBtn.onclick = showRegisterModal;
    authSection.appendChild(registerBtn);
  }
}
function showRegisterModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-slate-800 p-8 rounded-lg shadow-lg w-full max-w-sm">
      <h2 class="text-xl font-bold mb-4 text-white">Crear cuenta</h2>
      <form id="register-form" class="flex flex-col gap-4">
        <input type="text" name="username" placeholder="Usuario" class="p-2 rounded bg-slate-700 text-white" required />
        <input type="password" name="password" placeholder="Contraseña" class="p-2 rounded bg-slate-700 text-white" required />
        <button type="submit" class="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded">Registrarse</button>
      </form>
      <button id="close-register" class="mt-4 text-gray-400 hover:text-white">Cancelar</button>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('close-register').onclick = () => modal.remove();
  document.getElementById('register-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const username = form.username.value;
    const password = form.password.value;
    try {
      const res = await fetch(API_URL + '/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Cuenta creada. Espera aprobación del admin.');
        modal.remove();
      } else {
        alert(data.error || 'Error al crear cuenta');
      }
    } catch (err) {
      alert('Error de red');
    }
  };
}
async function fetchPendingUsers() {
  try {
    const res = await fetch(API_URL + '/pending-users', {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) return;
    const users = await res.json();
    const list = document.getElementById('pending-list');
    list.innerHTML = '';
    if (!users.length) {
      list.innerHTML = '<span class="text-gray-400">No hay usuarios pendientes.</span>';
      return;
    }
    users.forEach(u => {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-2';
      row.innerHTML = `<span class="text-white">${u.username}</span>`;
      const approveBtn = document.createElement('button');
      approveBtn.textContent = 'Aprobar';
      approveBtn.className = 'bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-3 rounded';
      approveBtn.onclick = async () => {
        const res2 = await fetch(API_URL + '/approve-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token
          },
          body: JSON.stringify({ username: u.username })
        });
        if (res2.ok) {
          alert('Usuario aprobado');
          fetchPendingUsers();
        } else {
          alert('Error al aprobar usuario');
        }
      };
      row.appendChild(approveBtn);
      list.appendChild(row);
    });
  } catch {}
}

function showLoginModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-slate-800 p-8 rounded-lg shadow-lg w-full max-w-sm">
      <h2 class="text-xl font-bold mb-4 text-white">Iniciar sesión</h2>
      <form id="login-form" class="flex flex-col gap-4">
        <input type="text" name="username" placeholder="Usuario" class="p-2 rounded bg-slate-700 text-white" required />
        <input type="password" name="password" placeholder="Contraseña" class="p-2 rounded bg-slate-700 text-white" required />
        <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded">Entrar</button>
      </form>
      <button id="close-login" class="mt-4 text-gray-400 hover:text-white">Cancelar</button>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('close-login').onclick = () => modal.remove();
  document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const username = form.username.value;
    const password = form.password.value;
    try {
      const res = await fetch(API_URL + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        token = data.token;
        modal.remove();
        location.reload();
      } else {
        alert(data.error || 'Error de autenticación');
      }
    } catch (err) {
      alert('Error de red');
    }
  };
}

async function fetchMovies() {
  moviesContainer.innerHTML = '<div class="col-span-full text-center text-gray-400">Cargando...</div>';
  try {
    const res = await fetch(API_URL + '/movies', {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (res.status === 401) {
      moviesContainer.innerHTML = '<div class="col-span-full text-center text-red-400">Debes iniciar sesión para ver las películas.</div>';
      return;
    }
    const movies = await res.json();
    if (!movies.length) {
      moviesContainer.innerHTML = '<div class="col-span-full text-center text-gray-400">No hay películas disponibles.</div>';
      return;
    }
    moviesContainer.innerHTML = '';
    movies.forEach(movie => {
      const card = document.createElement('div');
      card.className = 'movie-card bg-slate-800 rounded-lg shadow-lg overflow-hidden flex flex-col';
      card.innerHTML = `
        <div class="flex-1 flex items-center justify-center h-48 bg-slate-900">
          <svg class="w-16 h-16 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.868v4.264a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><rect width="20" height="12" x="2" y="6" rx="2" ry="2" /></svg>
        </div>
        <div class="p-4 flex flex-col gap-2">
          <h3 class="text-lg font-semibold truncate">${movie.filename}</h3>
          <button class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1 px-2 rounded play-btn">Ver</button>
        </div>
      `;
      card.querySelector('.play-btn').onclick = (e) => {
        e.stopPropagation();
        showVideoModal(movie);
      };
      moviesContainer.appendChild(card);
    });
  } catch (err) {
    moviesContainer.innerHTML = '<div class="col-span-full text-center text-red-400">Error al cargar películas.</div>';
  }
}

function showVideoModal(movie) {
  modalTitle.textContent = movie.filename;
  modalDescription.textContent = '';
  const src = API_URL + '/movies/stream/' + encodeURIComponent(movie.filename);
  downloadLink.href = API_URL + '/movies/download/' + encodeURIComponent(movie.filename);
  downloadLink.setAttribute('download', movie.filename);
  videoModal.classList.remove('hidden');

  // Crear un objeto URL temporal para el video con las credenciales
  const xhr = new XMLHttpRequest();
  xhr.open('GET', src);
  xhr.setRequestHeader('Authorization', `Bearer ${token}`);
  xhr.responseType = 'blob';
  
  xhr.onload = function() {
    if (xhr.status === 200) {
      const videoUrl = URL.createObjectURL(xhr.response);
      moviePlayer.src = videoUrl;
      moviePlayer.load();
      moviePlayer.play().catch(function(error) {
        console.error('Error al reproducir:', error);
      });
    } else {
      console.error('Error al cargar el video:', xhr.status);
      alert('Error al cargar el video. Por favor, intenta de nuevo.');
    }
  };
  
  xhr.onerror = function() {
    console.error('Error de red al cargar el video');
    alert('Error de red al cargar el video. Por favor, verifica tu conexión.');
  };
  
  xhr.send();
}

function hideVideoModal() {
  if (moviePlayer) {
    moviePlayer.pause();
    moviePlayer.src = '';
    // Liberar cualquier objeto URL creado
    if (moviePlayer.src.startsWith('blob:')) {
      URL.revokeObjectURL(moviePlayer.src);
    }
  }
  videoModal.classList.add('hidden');
}

closeModalButton.addEventListener('click', hideVideoModal);
videoModal.addEventListener('click', (event) => {
  if (event.target === videoModal) hideVideoModal();
});

document.addEventListener('DOMContentLoaded', () => {
  showAuthSection();
  fetchMovies();
  moviePlayer = document.getElementById('movie-player');
  if (window.videojs) {
    vjsPlayer = window.videojs(moviePlayer);
  }
});
