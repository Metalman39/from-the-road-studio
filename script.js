const terminal = document.querySelector(".terminal");
const boot = document.querySelector(".boot");

if (terminal && boot) {
  const original = boot.innerHTML;
  boot.innerHTML = "";

  let i = 0;
  const type = () => {
    boot.innerHTML = original.slice(0, i);
    i += 1;

    if (i <= original.length) {
      window.setTimeout(type, 12);
    }
  };

  window.setTimeout(type, 260);
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));

    if (!target) {
      return;
    }

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

document.querySelectorAll(".track-selector button").forEach((button) => {
  button.addEventListener("click", () => {
    const player = document.getElementById(button.dataset.player);

    if (!player) {
      return;
    }

    player.src = button.dataset.src;

    document
      .querySelectorAll(`.track-selector button[data-player="${button.dataset.player}"]`)
      .forEach((item) => item.classList.toggle("is-active", item === button));
  });
});
