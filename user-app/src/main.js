import { createApp } from "vue";
import { createPinia } from "pinia";
import Toast from "vue-toastification";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import App from "./App.vue";
import router from "./router";
import i18n from "./i18n";
import "./assets/main.css";
import "vue-toastification/dist/index.css";

dayjs.extend(relativeTime);

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
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: "button",
  icon: true,
  rtl: false,
});

app.mount("#app");
