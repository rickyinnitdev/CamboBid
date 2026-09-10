import { createApp } from "vue";
import { createPinia } from "pinia";
import Toast from "vue-toastification";
import App from "./App.vue";
import router from "./router";
import i18n from "./i18n";
import "./assets/main.css";
import "vue-toastification/dist/index.css";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(i18n);
app.use(Toast, {
  position: "top-right",
  timeout: 4000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  hideProgressBar: false,
  closeButton: "button",
  icon: true,
});

app.mount("#app");
