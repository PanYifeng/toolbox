import { renderReligion } from '/core/religion.js';
import { meta, sections, quiz } from './data.js';

// render 佛教文化：知识 / 测验 / 纪念卡
export default (el) => renderReligion(el, { meta, sections, quiz });
