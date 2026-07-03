import { Injectable } from '@nestjs/common';
import { GenerateMindMapDto } from './dto/generate-mind-map.dto';

type Prompt = {
  system: string;
  user: string;
};

@Injectable()
export class PromptBuilder {
  build(dto: GenerateMindMapDto): Prompt {
    const language = dto.language || 'vi';
    const level = dto.level || 'intermediate';
    const topicType = dto.topicType || 'history';

    return {
      system: this.buildSystemPrompt(language, topicType),
      user: this.buildUserPrompt(dto.text, language, level, topicType),
    };
  }

  private buildSystemPrompt(language: string, topicType: string): string {
    const langInstruction =
      language === 'vi'
        ? 'Bạn phải trả về nhãn bằng tiếng Việt.'
        : 'You must return labels in English.';

    const branchHints = this.getBranchHints(topicType, language);

    return [
      'Bạn là một trợ lý giáo dục chuyên tạo sơ đồ tư duy (mind map) từ văn bản học tập.',
      '',
      'QUY TẮC BẮT BUỘC:',
      '1. Chỉ trả về JSON thuần, không kèm markdown, code block, hay văn bản nào khác.',
      '2. JSON phải có cấu trúc: {"title": "...", "mindMap": {...}}',
      '3. mindMap là một node gốc với các trường: id, label, description, children',
      '4. Nhãn (label) phải NGẮN GỌN, tối đa 15 từ. Mỗi nhãn là một cụm từ ý nghĩa.',
      '5. Mô tả (description) có thể dài hơn, tối đa 200 từ.',
      '6. Độ sâu tối đa là 4 cấp (gốc → nhánh chính → nhánh phụ → chi tiết).',
      '7. Mỗi node phải có id duy nhất (dùng chuỗi: root, node-1, node-2, ...).',
      '8. children phải là mảng. Nếu không có con thì là mảng rỗng [].',
      '9. Chỉ trích xuất thông tin CÓ THẬT từ văn bản. KHÔNG bịa đặt.',
      '10. Nhóm các ý liên quan vào cùng một nhánh.',
      `11. ${langInstruction}`,
      '',
      branchHints,
    ].join('\n');
  }

  private buildUserPrompt(
    text: string,
    language: string,
    level: string,
    topicType: string,
  ): string {
    const levelGuide = this.getLevelGuide(level, language);
    const langLabel =
      language === 'vi'
        ? 'Hãy tạo sơ đồ tư duy bằng tiếng Việt cho văn bản sau.'
        : 'Create a mind map in English for the following text.';

    return [
      `${langLabel}`,
      '',
      `ĐỘ KHÓ: ${level}`,
      `${levelGuide}`,
      '',
      'VĂN BẢN:',
      text,
    ].join('\n');
  }

  private getBranchHints(topicType: string, language: string): string {
    const vi = language === 'vi';

    const hints: Record<string, string> = {
      history: vi
        ? 'Gợi ý nhánh cho chủ đề LỊCH SỬ: Bối cảnh, Nguyên nhân, Diễn biến, Nhân vật, Kết quả, Ý nghĩa, Bài học.'
        : 'Suggested branches for HISTORY: Context, Causes, Events, Key Figures, Results, Significance, Lessons.',
      heritage: vi
        ? 'Gợi ý nhánh cho DI SẢN: Vị trí, Lịch sử, Kiến trúc, Giá trị văn hóa, Sự kiện liên quan, Trải nghiệm tham quan.'
        : 'Suggested branches for HERITAGE: Location, History, Architecture, Cultural Value, Related Events, Visitor Experience.',
      lesson: vi
        ? 'Gợi ý nhánh cho BÀI HỌC: Mục tiêu, Kiến thức trọng tâm, Ví dụ, Ứng dụng, Câu hỏi ôn tập.'
        : 'Suggested branches for LESSON: Objectives, Key Knowledge, Examples, Applications, Review Questions.',
      event: vi
        ? 'Gợi ý nhánh cho SỰ KIỆN: Thời gian, Địa điểm, Nguyên nhân, Diễn biến, Hệ quả, Nhân vật liên quan.'
        : 'Suggested branches for EVENT: Time, Location, Causes, Developments, Consequences, Related Figures.',
      other: vi
        ? 'Gợi ý nhánh: Tổng quan, Chi tiết chính, Yếu tố quan trọng, Kết luận.'
        : 'Suggested branches: Overview, Main Details, Key Elements, Conclusion.',
    };

    return hints[topicType] || hints.other;
  }

  private getLevelGuide(level: string, language: string): string {
    const vi = language === 'vi';

    switch (level) {
      case 'basic':
        return vi
          ? 'Trình độ CƠ BẢN: Dùng ngôn ngữ đơn giản, nhánh ít hơn, tập trung vào ý chính.'
          : 'BASIC level: Use simple language, fewer branches, focus on main ideas.';
      case 'intermediate':
        return vi
          ? 'Trình độ TRUNG CẤP: Bao gồm chi tiết vừa phải, giải thích rõ ràng.'
          : 'INTERMEDIATE level: Include moderate detail, clear explanations.';
      case 'advanced':
        return vi
          ? 'Trình độ NÂNG CAO: Bao gồm chi tiết sâu, phân tích, mối liên hệ phức tạp.'
          : 'ADVANCED level: Include deep details, analysis, complex relationships.';
      default:
        return '';
    }
  }
}
