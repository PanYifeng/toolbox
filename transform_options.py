#!/usr/bin/env python3
"""
Rewrite quiz options in bank-myth.js to make the correct answer not trivially identifiable.

Rules:
1. Correct answer: strip leading negative words (不正确/不准确/没有可靠证据 etc.)
2. "仅对/仅在/仅限...成立" / "Only true for/in..." patterns → replace with plausible claim
3. "正确，但仅限..." / "Correct, but only for/in..." patterns → replace with plausible claim
4. "正确/准确/完全正确/完全准确" as wrong answer → replace with plausible claim
5. Obviously silly wrong answers → replace with plausible claim
6. Already-plausible wrong answers (e.g. "不正确，但天才能用 20%") → keep as-is
"""

import re

filepath = "/Users/dp/repo/toolbox/internal/web/static/tools/knowledge-quiz/bank-myth.js"

with open(filepath, 'r') as f:
    content = f.read()

lines = content.split('\n')
output_lines = list(lines)

# ============================================================
# Plausible wrong-answer pairs (zh, en)
# 30 entries, used round-robin across questions
# ============================================================
wrongs = [
    ("已有研究证实，该效应在多个独立实验室中被重复验证。",
     "Research has confirmed that this effect has been replicated across multiple independent laboratories."),
    ("多项实验表明，该机制在生物体内确实存在。",
     "Multiple studies demonstrate that this mechanism does exist in living organisms."),
    ("科学证据表明，这一现象具有统计学显著性。",
     "Scientific evidence indicates that this phenomenon is statistically significant."),
    ("临床数据支持，该结论在双盲对照试验中得到验证。",
     "Clinical data supports that this conclusion has been validated in double-blind trials."),
    ("流行病学调查显示，该关联在多元回归分析中保持显著。",
     "Epidemiological surveys show that this association remains significant in multivariate regression."),
    ("动物实验证实，该通路在种系间高度保守。",
     "Animal experiments confirm that this pathway is highly conserved across species."),
    ("生理学研究指出，该反馈回路在人体中持续发挥作用。",
     "Physiological research indicates that this feedback loop operates continuously in the human body."),
    ("细胞实验表明，该信号通路在特定条件下被激活。",
     "Cellular experiments show that this signaling pathway is activated under specific conditions."),
    ("核磁共振研究显示，相关脑区在任务态下显著激活。",
     "fMRI studies reveal that relevant brain regions show significant activation during task conditions."),
    ("大规模队列研究显示，该指标与结局呈剂量-反应关系。",
     "Large cohort studies show that this indicator exhibits a dose-response relationship with outcomes."),
    ("部分小规模研究支持这一假说，但尚需更大样本验证。",
     "Some small-scale studies support this hypothesis, but larger samples are needed."),
    ("在特定实验条件下，这一现象已被多次观察到。",
     "Under specific experimental conditions, this phenomenon has been observed repeatedly."),
    ("该问题在学术界存在一定争议，不同研究结论不一。",
     "This question has some academic debate with differing conclusions across studies."),
    ("初步研究表明，该机制可能存在但未被充分证实。",
     "Preliminary research suggests this mechanism may exist but has not been fully confirmed."),
    ("在特定人群中，该效应已被多项研究记录。",
     "In specific populations, this effect has been documented by multiple studies."),
    ("受限于当前检测手段，该问题尚无法最终定论。",
     "Limited by current detection methods, a definitive conclusion cannot yet be drawn."),
    ("部分研究支持该观点，但证据等级仍待提高。",
     "Some studies support this view, but the quality of evidence still needs improvement."),
    ("该现象在特定样本中呈现出显著相关性。",
     "This phenomenon shows significant correlation in specific samples."),
    ("回顾性研究提示可能存在关联，但前瞻性研究尚未证实。",
     "Retrospective studies suggest a possible link, but prospective studies have not confirmed it."),
    ("相关研究仍在进行中，目前尚无统一结论。",
     "Related research is ongoing and no consensus has been reached yet."),
    ("纵向研究数据显示，该效应在随访期内保持稳定。",
     "Longitudinal data show that this effect remains stable during the follow-up period."),
    ("机制研究表明，该过程涉及多条信号通路的协同调控。",
     "Mechanistic studies suggest that this process involves coordinated regulation of multiple signaling pathways."),
    ("群体遗传学分析显示，该性状在人群中呈多态性分布。",
     "Population genetic analysis shows that this trait is distributed polymorphically across populations."),
    ("剂量递增实验表明，该效应在阈值以上呈线性增长。",
     "Dose-escalation experiments show that this effect increases linearly above the threshold."),
    ("横断面调查数据显示，该现象在多个地区一致存在。",
     "Cross-sectional survey data show that this phenomenon exists consistently across multiple regions."),
    ("时间序列分析表明，该指标在干预后出现显著变化。",
     "Time-series analysis shows that this indicator changes significantly after intervention."),
    ("多中心随机对照试验为该结论提供了高级别证据。",
     "Multi-center randomized controlled trials provide high-level evidence for this conclusion."),
    ("功能影像学研究显示，该过程涉及多个脑区的协同激活。",
     "Functional imaging studies show that this process involves coordinated activation of multiple brain regions."),
    ("系统综述和荟萃分析确认了该效应的一致性。",
     "Systematic reviews and meta-analyses confirm the consistency of this effect."),
    ("队列研究经过充分随访后，数据支持该关联的因果方向。",
     "Cohort studies with adequate follow-up support the causal direction of this association."),
]

# ============================================================
# Helper functions
# ============================================================

def extract_zh_en(text):
    """Extract zh and en from an option line."""
    zh_match = re.search(r"zh: '([^']*)'", text)
    en_match = re.search(r"en: '([^']*)'", text)
    if zh_match and en_match:
        return zh_match.group(1), en_match.group(1)
    return None, None


def strip_negative_prefix(zh, en):
    """Remove leading negative words from the correct answer."""
    zh_neg = [
        r'^不正确，', r'^不准确，', r'^不准确；',
        r'^没有可靠证据，', r'^没有可靠证据；', r'^没有可靠证据支持',
        r'^证据有限，', r'^证据薄弱，', r'^未得到支持，',
        r'^不成立，', r'^缺乏可靠证据，', r'^不完全准确，', r'^没有，',
    ]
    for pat in zh_neg:
        if re.match(pat, zh):
            zh = re.sub(pat, '', zh)
            break

    if zh in ('没有可靠证据', '没有可靠证据支持', '没有可靠证据。'):
        zh = "现有科学证据不支持这一说法。"
    if zh == '没有':
        zh = "现有科学证据不支持这一说法。"
    if zh == '没有可靠证据' and en == 'No reliable evidence supports it':
        zh = "现有科学证据不支持这一说法。"
        en = "Current scientific evidence does not support this claim."

    en_neg = [
        r'^Incorrect, ', r'^Inaccurate; ', r'^Inaccurate, ',
        r'^Not supported; ', r'^Not supported, ',
        r'^No reliable evidence; ', r'^No reliable evidence, ',
        r'^Not quite; ', r'^Weak evidence; ', r'^Limited evidence; ',
        r'^Not valid; ', r'^No, ', r'^Lacks reliable evidence; ',
    ]
    for pat in en_neg:
        if re.match(pat, en):
            en = re.sub(pat, '', en)
            break

    if en == 'No reliable evidence supports it':
        en = "Current scientific evidence does not support this claim."

    if en and en[0].islower():
        en = en[0].upper() + en[1:]

    return zh, en


def needs_replacement(zh, en):
    """Check if this wrong option needs to be replaced with a plausible one."""

    # Pattern 1: "仅对/仅在/仅限...成立" (only true for/in...)
    if re.search(r'仅[对在]', zh) and '成立' in zh:
        return True
    if re.search(r'仅限', zh) and ('正确' in zh or '成立' in zh):
        return True

    # Pattern 2: "Only true for/in..." or "only for/in..." in English
    if re.search(r'only\s+(?:true for|true in|for|in)\s', en, re.IGNORECASE):
        return True

    # Pattern 3: "正确，但仅限..." / "Correct, but only for/in..."
    if re.search(r'正确，但仅限', zh):
        return True
    if re.search(r'[Cc]orrect, but only', en):
        return True

    # Pattern 4: "完全正确，"/"正确，"/"完全准确，"/"准确，" as a positive claim (wrong answer)
    if re.search(r'^(完全正确|正确|完全准确|准确)[，,]\s*', zh):
        return True
    if re.search(r'^(完全正确|正确|完全准确|准确)$', zh):
        return True

    # Pattern 5: "有，" / "有充分科学依据，"
    if re.search(r'^有[，,]\s*', zh):
        return True
    if re.search(r'^有充分科学依据', zh):
        return True

    # Pattern 6: "得到支持，"
    if re.search(r'^得到支持[，,]?\s*', zh):
        return True

    # Pattern 7: "完全得到支持" / "完全有"
    if re.search(r'^完全(得到支持|有)$', zh):
        return True

    # Pattern 8: "Completely correct"/"Correct"/"Completely accurate"/"Accurate" as claim
    if re.search(r'^(Completely correct|Correct|Completely accurate|Accurate)[，,]\s*', en):
        return True
    if re.search(r'^(Completely correct|Correct|Completely accurate|Accurate)$', en):
        return True

    # Pattern 9: "Fully supported"/"Fully, "/"Yes, "/"Supported"
    if re.search(r'^(Fully supported|Fully,|Yes,|Supported)', en):
        return True

    # Pattern 10: "没有，" as a wrong answer
    if re.search(r'^没有[，,]?\s*', zh):
        return True

    # Pattern 11: "No, " in English
    if re.search(r'^No, ', en):
        return True

    # Pattern 12: "完全正确" / "完全成立" / "完全有" (fully positive)
    if re.search(r'^完全(正确|成立|有)[，,]?\s*', zh):
        return True

    # Pattern 13: "仅对" / "仅在" (without 成立 - e.g. partial match)
    if zh.startswith('仅对') or zh.startswith('仅在'):
        return True
    if zh.startswith('仅限'):
        return True

    # Pattern 14: "Correct, " as a standalone claim (wrong answer that says "correct")
    if re.search(r'^Correct[,.]?\s*', en):
        return True

    return False


def is_silly(zh, en):
    """Check if the option is obviously silly."""
    silly_zh = [
        '卡通片证实', '所有研究都支持', '必得胆结石', '应一律倒掉', '必长菌',
        '所有塑料都致癌', '茶解药', '以形补形', '黑色入肾', '黏蛋白养胃',
        '醋酸中和酒精', '茶多酚促进代谢', '酒精助眠', '白藜芦醇护心', '牛奶黏稠',
        '蛋白质遇果酸成石', '糖与鞣酸成石', '有机酸与蛋白质结合致毒', '维生素C还原无机砷',
        '含锌量高', '醋酸溶解斑块', '骨头含钙多', '红糖含活血成分', '红枣含铁丰富',
        '驴皮胶质含丰富铁', '含玉米黄质', '释放致癌物', '产生大量亚硝胺', '产生大量亚硝酸盐',
        '含大量亚硝酸盐', '含大量亚硝胺', '微波是电离辐射', '应远离3米',
        '仙人掌特别能吸辐射', '可屏蔽所有辐射', '热量减少必瘦', '含大量铁', '所有鱼类都如此',
        '是其名称由来', '红色刺激公牛', '每段都能再生', '每次交配必发生', '是象的先天恐惧',
        '鲨鱼软骨可抗癌', '因其声波频率特殊', '日本研究证实', '大规模双盲实验证实',
        'O型血最招蚊', '完全得到支持', '毛囊受刺激', '脑科学已证实', 'fMRI已证实',
        '20世纪教科书共识', '可生长数天', '源于其血红素铁', '油炒是必需的',
        '咖啡因排钙', '茶多酚燃脂', '发酵产物降脂', '鞣酸与蛋白质致毒', '谷氨酸与蛋白质致毒',
        '土鸡蛋营养高', '汁化更易吸收', '蛋黄胆固醇高', '胶基难消化', '亚硝胺致癌',
        '是儿童白血病主因', '竹炭吸附甲醛', '绿植高效', '果皮吸附',
        '亚硝胺致癌', '高温熔化', '可可致痘', '激素所致',
    ]
    silly_en = [
        'proven by cartoons', 'all studies support it', 'definitely causes gallstones',
        'should always be discarded', 'definitely bacteria-laden', 'all plastics cause cancer',
        'tea neutralizes medicine', 'like-shape-nourishes-shape', 'black enters the kidney',
        'mucilage nourishes the stomach', 'acetic acid neutralizes ethanol',
        'tea polyphenols boost metabolism', 'the body feels warm', 'alcohol helps sleep',
        'resveratrol protects the heart', 'milk is viscous',
        'protein meets fruit acid to form stones', 'sugar + tannin forms stones',
        'organic acid + protein makes poison', 'vitamin C reduces inorganic arsenic',
        'high in zinc', 'acetic acid dissolves plaque', 'bones are calcium-rich',
        'brown sugar contains blood-activating components', 'jujubes are iron-rich',
        'donkey-hide gelatin is iron-rich', 'contains zeaxanthin', 'release carcinogens',
        'produces carcinogenic nitrosamines', 'produces much nitrosamine',
        'produces much nitrite', 'contains much nitrite', 'microwaves are ionizing radiation',
        'stay 3m away', 'cacti especially absorb radiation', 'shields all radiation',
        'confirmed by neuroscience', 'confirmed by fMRI', 'a 20th-century textbook consensus',
        'they grow for days', 'due to heme iron', 'oil-cooking is essential',
        'fewer calories guarantee weight loss', 'caffeine leaches calcium',
        'polyphenols burn fat', 'fermentation products lower lipids',
        'tannin + protein is toxic', 'glutamate + protein is toxic',
        'free-range brown eggs are more nutritious', 'juicing eases absorption',
        'yolk cholesterol is high', 'gum base is hard to digest',
        'it is a main cause of childhood leukemia',
        'charcoal adsorbs formaldehyde', 'plants are highly efficient', 'peel adsorbs',
        'cocoa causes acne', 'caused by hormones', 'follicles are stimulated',
        'confirmed by Japanese research',
    ]
    for s in silly_zh:
        if s in zh:
            return True
    for s in silly_en:
        if s in en:
            return True
    return False


# ============================================================
# Main processing
# ============================================================

q_idx = 0  # 1-based question counter
wrong_use_count = 0  # Track how many times we've used the plausible pool

for i in range(len(lines)):
    line = lines[i]
    if 'options: [' in line:
        # Collect option line numbers
        opt_lines = []
        j = i + 1
        while j < len(lines) and '    ],' not in lines[j]:
            opt_lines.append(j)
            j += 1
        opt_end = j

        # Parse the 4 options
        opts = []
        for ln in opt_lines:
            zh, en = extract_zh_en(lines[ln])
            if zh is not None:
                opts.append({'zh': zh, 'en': en, 'line': ln, 'text': lines[ln]})

        if len(opts) == 4:
            # Find the answer index
            answer_idx = None
            for k in range(opt_end + 1, min(opt_end + 10, len(lines))):
                m = re.search(r'answer: (\d)', lines[k])
                if m:
                    answer_idx = int(m.group(1))
                    break

            if answer_idx is not None:
                q_idx += 1

                # ----- Transform the correct answer -----
                corr = opts[answer_idx]
                new_zh, new_en = strip_negative_prefix(corr['zh'], corr['en'])
                if new_zh != corr['zh'] or new_en != corr['en']:
                    output_lines[corr['line']] = corr['text'].replace(
                        f"zh: '{corr['zh']}'", f"zh: '{new_zh}'"
                    ).replace(
                        f"en: '{corr['en']}'", f"en: '{new_en}'"
                    )

                # ----- Transform the 3 wrong answers -----
                wrong_idxs = [j for j in range(4) if j != answer_idx]
                for pos, idx in enumerate(wrong_idxs):
                    opt = opts[idx]
                    zh = opt['zh']
                    en = opt['en']
                    new_zh = zh
                    new_en = en

                    # Check if this option needs replacement
                    should_replace = False

                    if needs_replacement(zh, en):
                        should_replace = True
                    elif is_silly(zh, en):
                        should_replace = True

                    if should_replace:
                        ti = (wrong_use_count) % len(wrongs)
                        new_zh = wrongs[ti][0]
                        new_en = wrongs[ti][1]
                        wrong_use_count += 1

                    # Apply the change
                    if new_zh != zh or new_en != en:
                        output_lines[opt['line']] = opt['text'].replace(
                            f"zh: '{zh}'", f"zh: '{new_zh}'"
                        ).replace(
                            f"en: '{en}'", f"en: '{new_en}'"
                        )

with open(filepath, 'w') as f:
    f.write('\n'.join(output_lines))

print(f"Transformed {q_idx} questions | Used {wrong_use_count} pool replacements")