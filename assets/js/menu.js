document.addEventListener('DOMContentLoaded', function() { //DOMContentLoaded add now that I'm using as a Imported JS file
  // Get the hamburger icon, menu list, and submenu buttons
  const hamburger = document.querySelector('.menu-icon');
  const menuList = document.querySelector('#cssmenu ul');
  const submenuButtons = document.querySelectorAll('#cssmenu .has-sub > a');

  // Add event listener to the hamburger icon
  hamburger.addEventListener('click', function() {
    // Toggle the 'open' class to show/hide the menu
    menuList.classList.toggle('open');
  });

  // Add event listeners to the submenu buttons
  submenuButtons.forEach(function(button) {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const parentLi = button.parentNode;
      const submenu = parentLi.querySelector('ul');

      // Check if menu is in mobile mode
      if (window.innerWidth < 980) {
        // Toggle the active class for the clicked submenu
        parentLi.classList.toggle('active');

        // Toggle the display of the submenu
        submenu.style.display = submenu.style.display === 'block' ? 'none' : 'block';
      }
    });
  });

  // Close submenus when clicking outside the menu
  document.addEventListener('click', function(e) {
    const target = e.target;

    // Check if the clicked element is inside the menu
    if (!menuList.contains(target) && !hamburger.contains(target)) {
      // Close all submenus
      document.querySelectorAll('.has-sub.active').forEach(function(element) {
        element.classList.remove('active');

        // Hide the submenu
        const submenu = element.querySelector('ul');
        submenu.style.display = 'none';
      });

      // Hide the menu
      menuList.classList.remove('open');
    }
  });
});


// my comment in portuguese 
//Agora que eu quis separar em um arquivo .js o codigo do menu, precisei add DOMContentLoaded já que o menu não funcionou corretamente assim.
//O problema é que o JavaScript estava tentando adicionar um ouvinte de evento a um elemento que ainda não foi carregado no DOM. 
//Quando o JavaScript é colocado no HTML, ele é executado após o carregamento do DOM, então não era necessário. 
//No entanto, quando está em um arquivo .js externo, ele pode ser executado antes que o DOM esteja totalmente carregado, resultando no erro `Uncaught TypeError: Cannot read properties of null (reading 'addEventListener')`.
//A solução é envolver seu código em um ouvinte de evento DOMContentLoaded para garantir que o DOM esteja totalmente carregado antes de seu código ser executado.
