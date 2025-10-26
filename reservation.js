const openBtn = document.getElementById('openReservation');
const modal = document.getElementById('reservationModal');
const closeBtn = document.getElementById('closeModal');

// Atver modal
openBtn.addEventListener('click', () => {
    modal.style.display = 'block';
});

// Aizver modal, ja klikšķis uz "X"
closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Aizver modal, ja klikšķis ārpus satura
window.addEventListener('click', (e) => {
    if(e.target === modal){
        modal.style.display = 'none';
    }
});

// Rezervācijas forma nosūtīšana (Formspree)
document.getElementById('reservationForm').addEventListener('submit', async function(e){
    e.preventDefault();
    const formData = new FormData(this);
    const endpoint = 'https://formspree.io/f/mrbyndyw';

    const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
    });

    if(response.ok){
        alert('Rezervācija nosūtīta! Paldies!');
        this.reset();
        modal.style.display = 'none';
    } else {
        alert('Kļūda, mēģiniet vēlreiz.');
    }
});
