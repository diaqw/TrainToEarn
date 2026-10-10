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
  return { version: 1, campaigns: [{ id, name: 'Kazakh AI Translation', description: 'Natural Kazakh for digital products', language: 'RU → KZ', domain: 'Interfaces and support', rate: 5, budget: 1000, funded: 0, paid: 0, reserved: 0, status: 'draft', createdAt: new Date().toISOString() }],
    tasks: examples.map((x, i) => ({ id: uid(), campaignId: id, source: x[0], a: x[1], b: x[2], gold: [1, 6, 9].includes(i) ? 'a' : null })), submissions: [], payments: [], events: [] };
}
export function fail(message, status = 400) { const e = new Error(message); e.status = status; throw e; }
export function campaign(state, id) { return state.campaigns.find(c => c.id === id) || fail('Campaign not found', 404); }
export function event(state, text) { state.events.unshift({ id: uid(), text, at: new Date().toISOString() }); state.events = state.events.slice(0, 100); }
export function publicState(s, ai) {
  s = structuredClone(s);
  const pilot = s.campaigns.find(c => c.id === 'kazakh-pilot');
  if (pilot?.description === 'Естественный казахский для цифровых продуктов') pilot.description = 'Natural Kazakh for digital products';
  for (const x of s.submissions) {
    if (x.check === 'Инструкция соблюдена. Проверка пройдена.') x.check = 'Instruction check passed. Verification passed.';
    if (x.check === 'Инструкция соблюдена. Ожидает экспертной проверки.') x.check = 'Instruction check passed. Awaiting expert review.';
    if (x.ai?.unavailable) x.ai.explanation = 'AI review is unavailable. Expert review required.';
  }
  return { campaigns: s.campaigns.map(c => ({ ...c, total: s.tasks.filter(t => t.campaignId === c.id).length, submitted: s.submissions.filter(t => t.campaignId === c.id).length })), submissions: s.submissions.map(({ control, controlCorrect, ...x }) => x), payments: s.payments, events: s.events, aiEnabled: ai, mode: 'simulation',
    stats: { controls: s.submissions.filter(x => x.control).length, correct: s.submissions.filter(x => x.controlCorrect).length } };
}
export function nextTask(s, id) {
  const c = campaign(s, id);
  if (c.status !== 'active') fail('This campaign has not been funded');
  const t = s.tasks.find(t => t.campaignId === id && !s.submissions.some(x => x.taskId === t.id));
  if (!t) return null;
  const { gold, ...safe } = t;
  return safe;
}
export function createCampaign(s, input) {
  const name = String(input.name || '').trim();
  const rate = Number(input.rate), budget = Number(input.budget);
  if (name.length < 3 || name.length > 100) fail('Name must be 3–100 characters');
  if (!Number.isSafeInteger(rate) || rate < 1 || !Number.isSafeInteger(budget) || budget < rate || budget > 10000000) fail('Enter a valid budget and reward rate');
  if (!Array.isArray(input.tasks) || input.tasks.length < 1 || input.tasks.length > 500) fail('Upload 1–500 tasks');
  const id = uid();
  const tasks = input.tasks.map(t => {
    if (!['source', 'a', 'b'].every(k => typeof t[k] === 'string' && t[k].trim().length && t[k].length <= 5000)) fail('Each task requires source, a, and b (up to 5,000 characters)');
    if (t.gold && !['a', 'b', 'tie', 'neither'].includes(t.gold)) fail('Invalid reference answer');
    return { id: uid(), campaignId: id, source: t.source.trim(), a: t.a.trim(), b: t.b.trim(), gold: t.gold || null };
  });
  if (budget < tasks.length * rate) fail('The budget must cover every task, including controls');
  s.campaigns.push({ id, name, description: String(input.description || 'Kazakh language · translation reviews').slice(0, 200), language: 'RU → KZ', domain: 'Custom dataset', rate, budget, funded: 0, reserved: 0, paid: 0, status: 'draft', createdAt: new Date().toISOString() });
  // Shuffle controls together with production items; the contributor API never returns gold.
  for (let i = tasks.length - 1; i > 0; i--) { const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1); [tasks[i], tasks[j]] = [tasks[j], tasks[i]]; }
  s.tasks.push(...tasks); event(s, 'Campaign created: «' + name + '»'); return id;
}
export function fund(s, id) {
  const c = campaign(s, id);
  if (c.status !== 'draft') fail('This campaign is already funded', 409);
  c.funded = c.budget; c.status = 'active'; event(s, 'Test budget locked: ' + c.name);
}
export function submit(s, input, ai = null) {
  const task = s.tasks.find(t => t.id === input.taskId) || fail('Task not found', 404);
  const c = campaign(s, task.campaignId);
  if (c.status !== 'active') fail('Campaign is closed');
  if (s.submissions.some(x => x.taskId === task.id)) fail('Answer already submitted', 409);
  if (!['a', 'b', 'tie', 'neither'].includes(input.choice)) fail('Select a rating');
  const reason = String(input.reason || '').trim();
  if (reason.length < 15 || reason.length > 2000) fail('Explanation must be 15–2,000 characters');
  if (c.funded - c.paid - c.reserved < c.rate) fail('Insufficient pool balance', 409);
  const control = !!task.gold;
  const correct = control && input.choice === task.gold;
  const status = correct ? 'accepted' : 'review';
  const result = { id: uid(), taskId: task.id, campaignId: c.id, source: task.source, a: task.a, b: task.b, choice: input.choice, reason, status, reward: c.rate, control, controlCorrect: correct, ai, reviewerNote: '', appeal: '', ruleVersion: '1.0', at: new Date().toISOString(), check: 'Instruction check passed. ' + (correct ? 'Verification passed.' : 'Awaiting expert review.') };
  c.reserved += c.rate; s.submissions.unshift(result); event(s, 'New translation review received'); return result.id;
}
export function review(s, input) {
  const x = s.submissions.find(x => x.id === input.id) || fail('Submission not found', 404);
  if (x.status !== 'review') fail('Submission already reviewed', 409);
  if (!['accepted', 'rejected'].includes(input.decision)) fail('Invalid decision');
  const note = String(input.note || '').trim();
  if (note.length < 5 || note.length > 1000) fail('Provide a decision rationale (5–1,000 characters)');
  x.status = input.decision; x.reviewerNote = note;
  if (x.status === 'rejected') campaign(s, x.campaignId).reserved -= x.reward;
  event(s, x.status === 'accepted' ? 'Expert accepted the review' : 'Expert rejected the review');
}
export function appeal(s, input) {
  const x = s.submissions.find(x => x.id === input.id) || fail('Submission not found', 404);
  if (x.status !== 'rejected' || x.appeal) fail('Another appeal is not available', 409);
  const reason = String(input.reason || '').trim();
  if (reason.length < 10 || reason.length > 1000) fail('Rationale must be 10–1,000 characters');
  const c = campaign(s, x.campaignId);
  if (c.status !== 'active' || c.funded - c.paid - c.reserved < x.reward) fail('The campaign is closed or its budget is exhausted', 409);
  c.reserved += x.reward; x.status = 'review'; x.appeal = reason; event(s, 'Review appeal requested');
}
export function pay(s, id) {
  const c = campaign(s, id);
  const items = s.submissions.filter(x => x.campaignId === id && x.status === 'accepted');
  if (!items.length) fail('No accepted unpaid reviews', 409);
  const amount = items.reduce((sum, x) => sum + x.reward, 0);
  if (amount > c.reserved || amount > c.funded - c.paid) fail('Pool balance invariant violated', 409);
  const payment = { id: uid(), campaignId: id, amount, count: items.length, at: new Date().toISOString(), mode: 'simulation' };
  items.forEach(x => { x.status = 'paid'; x.paymentId = payment.id; });
  c.paid += amount; c.reserved -= amount; s.payments.unshift(payment); event(s, 'Test reward credited for ' + items.length + ' reviews'); return payment;
}
export function close(s, id) {
  const c = campaign(s, id);
  if (c.status !== 'active') fail('Campaign is not active', 409);
  if (c.reserved || s.submissions.some(x => x.campaignId === id && x.status === 'rejected' && !x.appeal)) fail('Complete pending payouts and appeals. Rejected submissions retain their right to appeal.', 409);
  c.refunded = c.funded - c.paid; c.status = 'closed'; event(s, 'Campaign closed; available balance refunded');
}
export function exportRows(s, id) {
  campaign(s, id);
  return s.submissions.filter(x => x.campaignId === id && !x.control && ['accepted', 'paid'].includes(x.status)).map(x => ({ source: x.source, translation_a: x.a, translation_b: x.b, preference: x.choice, rationale: x.reason, status: x.status, reviewer_note: x.reviewerNote, rubric_version: x.ruleVersion, created_at: x.at }));
}
