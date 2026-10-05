export const uid = () => crypto.randomUUID();
const examples = [
  ['Добро пожаловать! Чем я могу вам помочь?', 'Қош келдіңіз! Сізге қалай көмектесе аламын?', 'Қош келдіңіз! Мен сізге не көмектесе алады?'],
  ['Ваш заказ будет доставлен завтра.', 'Тапсырысыңыз ертең жеткізіледі.', 'Сіздің тапсырыс кеше жеткізілді.'],
  ['Пожалуйста, проверьте адрес электронной почты.', 'Электрондық пошта мекенжайын тексеріңізші.', 'Электрондық пошта мекенжайын тексеріңіз.'],
  ['Вы можете отменить подписку в любое время.', 'Жазылымнан кез келген уақытта бас тарта аласыз.', 'Жазылымды кез келген уақытта тоқтатуға болады.'],
  ['Изменения успешно сохранены.', 'Өзгерістер сәтті сақталды.', 'Өзгерістер сәтті сақтау.'],
  ['Спасибо за обратную связь.', 'Кері байланысыңыз үшін рақмет.', 'Пікіріңізге рақмет.'],
  ['До встречи на следующей неделе!', 'Келесі аптада кездескенше!', 'Кеше аптада кездескенше!'],
  ['Восстановить доступ к аккаунту', 'Аккаунтқа кіру мүмкіндігін қалпына келтіру', 'Есептік жазбаға қолжетімділікті қалпына келтіру'],
  ['Выберите удобное время для встречи.', 'Кездесуге ыңғайлы уақытты таңдаңыз.', 'Кездесу үшін қолайлы уақытты таңдаңыз.'],
  ['Этот файл недоступен.', 'Бұл файл қолжетімді емес.', 'Бұл файл қолжетімді.'],
  ['Мы отправили вам код подтверждения.', 'Біз сізге растау кодын жібердік.', 'Сізге растау коды жіберілді.'],
  ['Срок действия ссылки истёк.', 'Сілтеменің жарамдылық мерзімі аяқталды.', 'Сілтеме мерзімі өтті.'],
];
export function initialState() {
  const id = 'kazakh-pilot';
  return { version: 1, campaigns: [{ id, name: 'Kazakh AI Translation', description: 'Естественный казахский для цифровых продуктов', language: 'RU → KZ', domain: 'Интерфейсы и поддержка', rate: 5, budget: 1000, funded: 0, paid: 0, reserved: 0, status: 'draft', createdAt: new Date().toISOString() }],
    tasks: examples.map((x, i) => ({ id: uid(), campaignId: id, source: x[0], a: x[1], b: x[2], gold: [1, 6, 9].includes(i) ? 'a' : null })), submissions: [], payments: [], events: [] };
}
export function fail(message, status = 400) { const e = new Error(message); e.status = status; throw e; }
export function campaign(state, id) { return state.campaigns.find(c => c.id === id) || fail('Кампания не найдена', 404); }
export function event(state, text) { state.events.unshift({ id: uid(), text, at: new Date().toISOString() }); state.events = state.events.slice(0, 100); }
export function publicState(s, ai) {
  return { campaigns: s.campaigns.map(c => ({ ...c, total: s.tasks.filter(t => t.campaignId === c.id).length, submitted: s.submissions.filter(t => t.campaignId === c.id).length })), submissions: s.submissions.map(({ control, controlCorrect, ...x }) => x), payments: s.payments, events: s.events, aiEnabled: ai, mode: 'simulation',
    stats: { controls: s.submissions.filter(x => x.control).length, correct: s.submissions.filter(x => x.controlCorrect).length } };
}
export function nextTask(s, id) {
  const c = campaign(s, id);
  if (c.status !== 'active') fail('Кампания ещё не профинансирована');
  const t = s.tasks.find(t => t.campaignId === id && !s.submissions.some(x => x.taskId === t.id));
  if (!t) return null;
  const { gold, ...safe } = t;
  return safe;
}
export function createCampaign(s, input) {
  const name = String(input.name || '').trim();
  const rate = Number(input.rate), budget = Number(input.budget);
  if (name.length < 3 || name.length > 100) fail('Название: от 3 до 100 символов');
  if (!Number.isSafeInteger(rate) || rate < 1 || !Number.isSafeInteger(budget) || budget < rate || budget > 10000000) fail('Укажите корректный бюджет и ставку');
  if (!Array.isArray(input.tasks) || input.tasks.length < 1 || input.tasks.length > 500) fail('Загрузите от 1 до 500 заданий');
  const id = uid();
  const tasks = input.tasks.map(t => {
    if (!['source', 'a', 'b'].every(k => typeof t[k] === 'string' && t[k].trim().length && t[k].length <= 5000)) fail('Каждому заданию нужны source, a и b (до 5000 символов)');
    if (t.gold && !['a', 'b', 'tie', 'neither'].includes(t.gold)) fail('Недопустимый эталон');
    return { id: uid(), campaignId: id, source: t.source.trim(), a: t.a.trim(), b: t.b.trim(), gold: t.gold || null };
  });
  if (budget < tasks.length * rate) fail('Бюджет должен покрывать все задания, включая контрольные');
  s.campaigns.push({ id, name, description: String(input.description || 'Казахский язык · оценка переводов').slice(0, 200), language: 'RU → KZ', domain: 'Пользовательский датасет', rate, budget, funded: 0, reserved: 0, paid: 0, status: 'draft', createdAt: new Date().toISOString() });
  // Shuffle controls together with production items; the contributor API never returns gold.
  for (let i = tasks.length - 1; i > 0; i--) { const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1); [tasks[i], tasks[j]] = [tasks[j], tasks[i]]; }
  s.tasks.push(...tasks); event(s, 'Создана кампания «' + name + '»'); return id;
}
export function fund(s, id) {
  const c = campaign(s, id);
  if (c.status !== 'draft') fail('Кампания уже профинансирована', 409);
  c.funded = c.budget; c.status = 'active'; event(s, 'Тестовый бюджет заблокирован: ' + c.name);
}
export function submit(s, input, ai = null) {
  const task = s.tasks.find(t => t.id === input.taskId) || fail('Задание не найдено', 404);
  const c = campaign(s, task.campaignId);
  if (c.status !== 'active') fail('Кампания закрыта');
  if (s.submissions.some(x => x.taskId === task.id)) fail('Ответ уже отправлен', 409);
  if (!['a', 'b', 'tie', 'neither'].includes(input.choice)) fail('Выберите оценку');
  const reason = String(input.reason || '').trim();
  if (reason.length < 15 || reason.length > 2000) fail('Объяснение: от 15 до 2000 символов');
  if (c.funded - c.paid - c.reserved < c.rate) fail('Недостаточно средств в пуле', 409);
  const control = !!task.gold;
  const correct = control && input.choice === task.gold;
  const status = correct ? 'accepted' : 'review';
  const result = { id: uid(), taskId: task.id, campaignId: c.id, source: task.source, a: task.a, b: task.b, choice: input.choice, reason, status, reward: c.rate, control, controlCorrect: correct, ai, reviewerNote: '', appeal: '', ruleVersion: '1.0', at: new Date().toISOString(), check: 'Инструкция соблюдена. ' + (correct ? 'Проверка пройдена.' : 'Ожидает экспертной проверки.') };
  c.reserved += c.rate; s.submissions.unshift(result); event(s, 'Получена новая оценка перевода'); return result.id;
}
export function review(s, input) {
  const x = s.submissions.find(x => x.id === input.id) || fail('Ответ не найден', 404);
  if (x.status !== 'review') fail('Ответ уже проверен', 409);
  if (!['accepted', 'rejected'].includes(input.decision)) fail('Недопустимое решение');
  const note = String(input.note || '').trim();
  if (note.length < 5 || note.length > 1000) fail('Добавьте обоснование решения (5–1000 символов)');
  x.status = input.decision; x.reviewerNote = note;
  if (x.status === 'rejected') campaign(s, x.campaignId).reserved -= x.reward;
  event(s, x.status === 'accepted' ? 'Эксперт принял оценку' : 'Эксперт отклонил оценку');
}
export function appeal(s, input) {
  const x = s.submissions.find(x => x.id === input.id) || fail('Ответ не найден', 404);
  if (x.status !== 'rejected' || x.appeal) fail('Повторный пересмотр недоступен', 409);
  const reason = String(input.reason || '').trim();
  if (reason.length < 10 || reason.length > 1000) fail('Обоснование: 10–1000 символов');
  const c = campaign(s, x.campaignId);
  if (c.status !== 'active' || c.funded - c.paid - c.reserved < x.reward) fail('Кампания закрыта или бюджет исчерпан', 409);
  c.reserved += x.reward; x.status = 'review'; x.appeal = reason; event(s, 'Запрошен пересмотр оценки');
}
export function pay(s, id) {
  const c = campaign(s, id);
  const items = s.submissions.filter(x => x.campaignId === id && x.status === 'accepted');
  if (!items.length) fail('Нет принятых неоплаченных оценок', 409);
  const amount = items.reduce((sum, x) => sum + x.reward, 0);
  if (amount > c.reserved || amount > c.funded - c.paid) fail('Нарушен баланс пула', 409);
  const payment = { id: uid(), campaignId: id, amount, count: items.length, at: new Date().toISOString(), mode: 'simulation' };
  items.forEach(x => { x.status = 'paid'; x.paymentId = payment.id; });
  c.paid += amount; c.reserved -= amount; s.payments.unshift(payment); event(s, 'Начислена тестовая выплата за ' + items.length + ' оценок'); return payment;
}
export function close(s, id) {
  const c = campaign(s, id);
  if (c.status !== 'active') fail('Кампания не активна', 409);
  if (c.reserved || s.submissions.some(x => x.campaignId === id && x.status === 'rejected' && !x.appeal)) fail('Завершите выплаты и пересмотры. Отклонённые оценки сохраняют право на апелляцию.', 409);
  c.refunded = c.funded - c.paid; c.status = 'closed'; event(s, 'Кампания завершена, свободный остаток возвращён');
}
export function exportRows(s, id) {
  campaign(s, id);
  return s.submissions.filter(x => x.campaignId === id && !x.control && ['accepted', 'paid'].includes(x.status)).map(x => ({ source: x.source, translation_a: x.a, translation_b: x.b, preference: x.choice, rationale: x.reason, status: x.status, reviewer_note: x.reviewerNote, rubric_version: x.ruleVersion, created_at: x.at }));
}
