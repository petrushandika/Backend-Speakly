import { z } from "zod";
import { eq, and, ilike } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { vocabulary, users } from "../db/schema";
import { complete } from "../services/groq";

export interface StudyWord {
  word: string;
  phonetic: string;
  definition: string;
  indonesian: string;
  example: string;
  category: string;
  cefrLevel: string;
}

const STUDY_WORDS: StudyWord[] = [
  // ── A1 ────────────────────────────────────────────────────────────────────
  { word: "greet",       phonetic: "/ɡriːt/",             definition: "To say hello to someone",                             indonesian: "menyapa",                  example: "She always greets her colleagues warmly.",               category: "social",           cefrLevel: "A1" },
  { word: "introduce",   phonetic: "/ˌɪn.trəˈdjuːs/",    definition: "To present someone to another person",                indonesian: "memperkenalkan",            example: "Let me introduce my friend, Sarah.",                     category: "social",           cefrLevel: "A1" },
  { word: "describe",    phonetic: "/dɪˈskraɪb/",         definition: "To say what something or someone is like",           indonesian: "mendeskripsikan",           example: "Can you describe your neighborhood?",                    category: "communication",    cefrLevel: "A1" },
  { word: "polite",      phonetic: "/pəˈlaɪt/",           definition: "Behaving in a respectful and considerate way",       indonesian: "sopan",                    example: "It is polite to say thank you.",                         category: "manners",          cefrLevel: "A1" },
  { word: "fluent",      phonetic: "/ˈfluː.ənt/",         definition: "Able to speak a language easily and accurately",     indonesian: "fasih / lancar",            example: "She is fluent in three languages.",                       category: "language",         cefrLevel: "A1" },
  { word: "ask",         phonetic: "/ɑːsk/",              definition: "To request information or help",                     indonesian: "bertanya / meminta",        example: "Don't be afraid to ask questions in class.",             category: "communication",    cefrLevel: "A1" },
  { word: "answer",      phonetic: "/ˈɑːn.sər/",          definition: "To reply to a question",                             indonesian: "menjawab",                 example: "She answered all the interview questions confidently.",   category: "communication",    cefrLevel: "A1" },
  { word: "help",        phonetic: "/help/",              definition: "To make something easier or assist someone",         indonesian: "membantu",                 example: "Can you help me carry this box?",                        category: "social",           cefrLevel: "A1" },
  { word: "understand",  phonetic: "/ˌʌn.dəˈstænd/",     definition: "To know the meaning of something",                   indonesian: "mengerti / memahami",       example: "I don't understand this sentence.",                       category: "language",         cefrLevel: "A1" },
  { word: "repeat",      phonetic: "/rɪˈpiːt/",           definition: "To say or do something again",                       indonesian: "mengulang",                example: "Could you repeat that, please?",                         category: "communication",    cefrLevel: "A1" },
  { word: "learn",       phonetic: "/lɜːn/",              definition: "To gain knowledge or skill through study",           indonesian: "belajar / mempelajari",     example: "I want to learn a new language every year.",              category: "language",         cefrLevel: "A1" },
  { word: "speak",       phonetic: "/spiːk/",             definition: "To use words to express yourself verbally",          indonesian: "berbicara",                example: "He speaks English and French.",                          category: "language",         cefrLevel: "A1" },
  { word: "listen",      phonetic: "/ˈlɪs.ən/",           definition: "To pay attention to sounds or speech",               indonesian: "mendengarkan",             example: "Always listen carefully before you respond.",            category: "communication",    cefrLevel: "A1" },
  { word: "friend",      phonetic: "/frend/",             definition: "A person you know and like",                         indonesian: "teman",                    example: "She is my best friend from school.",                     category: "social",           cefrLevel: "A1" },
  { word: "family",      phonetic: "/ˈfæm.ɪ.li/",         definition: "A group of related people",                          indonesian: "keluarga",                 example: "My family loves eating together on weekends.",           category: "social",           cefrLevel: "A1" },
  { word: "work",        phonetic: "/wɜːk/",              definition: "To do a job or activity",                            indonesian: "bekerja / pekerjaan",       example: "She works at a hospital as a nurse.",                     category: "work",             cefrLevel: "A1" },
  { word: "live",        phonetic: "/lɪv/",               definition: "To make your home in a place",                       indonesian: "tinggal",                  example: "I live in Jakarta with my family.",                      category: "daily life",       cefrLevel: "A1" },
  { word: "like",        phonetic: "/laɪk/",              definition: "To find something pleasant or enjoyable",            indonesian: "menyukai / suka",           example: "I like reading books in the evening.",                    category: "daily life",       cefrLevel: "A1" },
  { word: "want",        phonetic: "/wɒnt/",              definition: "To feel a desire for something",                     indonesian: "ingin / menginginkan",      example: "I want to improve my English pronunciation.",             category: "daily life",       cefrLevel: "A1" },
  { word: "come",        phonetic: "/kʌm/",               definition: "To move toward a person or place",                   indonesian: "datang",                   example: "Please come to the meeting on time.",                    category: "daily life",       cefrLevel: "A1" },

  // ── A2 ────────────────────────────────────────────────────────────────────
  { word: "apologize",   phonetic: "/əˈpɒl.ə.dʒaɪz/",    definition: "To say sorry for something you did wrong",           indonesian: "meminta maaf",             example: "He apologized for being late to the meeting.",           category: "social",           cefrLevel: "A2" },
  { word: "recommend",   phonetic: "/ˌrek.əˈmend/",       definition: "To suggest something as being good or suitable",     indonesian: "merekomendasikan",          example: "I recommend visiting the old town.",                     category: "communication",    cefrLevel: "A2" },
  { word: "suggest",     phonetic: "/səˈdʒest/",           definition: "To put forward an idea for consideration",           indonesian: "menyarankan",               example: "She suggested going to a new restaurant.",               category: "communication",    cefrLevel: "A2" },
  { word: "complaint",   phonetic: "/kəmˈpleɪnt/",         definition: "An expression of dissatisfaction",                   indonesian: "keluhan",                  example: "He made a complaint about the noisy neighbors.",         category: "social",           cefrLevel: "A2" },
  { word: "opinion",     phonetic: "/əˈpɪn.jən/",          definition: "A personal view or belief",                          indonesian: "pendapat / opini",          example: "In my opinion, learning English is essential.",          category: "communication",    cefrLevel: "A2" },
  { word: "improve",     phonetic: "/ɪmˈpruːv/",           definition: "To make or become better",                           indonesian: "meningkatkan / memperbaiki", example: "Regular practice will improve your speaking skills.",   category: "language",         cefrLevel: "A2" },
  { word: "explain",     phonetic: "/ɪkˈspleɪn/",          definition: "To make something clear or easy to understand",      indonesian: "menjelaskan",               example: "Could you explain that again more slowly?",              category: "communication",    cefrLevel: "A2" },
  { word: "compare",     phonetic: "/kəmˈpeər/",           definition: "To look at similarities and differences",            indonesian: "membandingkan",             example: "Let's compare the two products before deciding.",        category: "critical thinking", cefrLevel: "A2" },
  { word: "decide",      phonetic: "/dɪˈsaɪd/",            definition: "To make a choice or come to a conclusion",           indonesian: "memutuskan",               example: "We need to decide on a meeting time.",                   category: "daily life",       cefrLevel: "A2" },
  { word: "plan",        phonetic: "/plæn/",               definition: "An arrangement or intention for the future",         indonesian: "rencana / merencanakan",    example: "What's your plan for the weekend?",                      category: "daily life",       cefrLevel: "A2" },
  { word: "appointment", phonetic: "/əˈpɔɪnt.mənt/",       definition: "A meeting arranged for a particular time",           indonesian: "janji temu",               example: "I have a doctor's appointment at 3pm.",                  category: "daily life",       cefrLevel: "A2" },
  { word: "schedule",    phonetic: "/ˈʃed.juːl/",          definition: "A plan or timetable of activities",                  indonesian: "jadwal",                   example: "The schedule for the conference is very tight.",          category: "work",             cefrLevel: "A2" },
  { word: "prefer",      phonetic: "/prɪˈfɜː/",            definition: "To like one thing more than another",                indonesian: "lebih suka / memilih",      example: "I prefer tea over coffee in the morning.",                category: "daily life",       cefrLevel: "A2" },
  { word: "practice",    phonetic: "/ˈpræk.tɪs/",          definition: "Repeated activity to improve a skill",               indonesian: "berlatih / latihan",        example: "Daily practice is the key to fluency.",                   category: "language",         cefrLevel: "A2" },
  { word: "mistake",     phonetic: "/mɪˈsteɪk/",           definition: "Something done incorrectly",                         indonesian: "kesalahan",                example: "Making mistakes is a natural part of learning.",         category: "language",         cefrLevel: "A2" },
  { word: "remember",    phonetic: "/rɪˈmem.bər/",         definition: "To bring something back to mind",                    indonesian: "mengingat",                example: "I can never remember new vocabulary without practice.",   category: "language",         cefrLevel: "A2" },
  { word: "travel",      phonetic: "/ˈtræv.əl/",           definition: "To go from one place to another",                    indonesian: "bepergian / perjalanan",    example: "She loves to travel to new countries.",                   category: "daily life",       cefrLevel: "A2" },
  { word: "culture",     phonetic: "/ˈkʌl.tʃər/",          definition: "The beliefs and customs of a society",               indonesian: "budaya",                   example: "Understanding culture helps you communicate better.",    category: "social",           cefrLevel: "A2" },
  { word: "experience",  phonetic: "/ɪkˈspɪər.i.əns/",     definition: "Knowledge gained from doing something",              indonesian: "pengalaman",               example: "I gained a lot of experience from that project.",        category: "work",             cefrLevel: "A2" },
  { word: "different",   phonetic: "/ˈdɪf.ər.ənt/",        definition: "Not the same as something else",                     indonesian: "berbeda",                  example: "English grammar is very different from Indonesian.",     category: "language",         cefrLevel: "A2" },

  // ── B1 ────────────────────────────────────────────────────────────────────
  { word: "persuade",    phonetic: "/pəˈsweɪd/",           definition: "To convince someone to do or believe something",     indonesian: "meyakinkan / membujuk",     example: "She persuaded her manager to approve the budget.",        category: "communication",    cefrLevel: "B1" },
  { word: "negotiate",   phonetic: "/nɪˈɡəʊ.ʃi.eɪt/",     definition: "To discuss something to reach an agreement",         indonesian: "bernegosiasi",              example: "They negotiated a better deal with the supplier.",        category: "business",         cefrLevel: "B1" },
  { word: "clarify",     phonetic: "/ˈklær.ɪ.faɪ/",        definition: "To make something clearer or easier to understand",  indonesian: "mengklarifikasi",           example: "Could you clarify what you meant by that?",              category: "communication",    cefrLevel: "B1" },
  { word: "elaborate",   phonetic: "/ɪˈlæb.ər.eɪt/",      definition: "To explain in more detail",                          indonesian: "menjelaskan lebih lanjut",  example: "Please elaborate on your proposal.",                     category: "communication",    cefrLevel: "B1" },
  { word: "emphasize",   phonetic: "/ˈem.fə.saɪz/",        definition: "To give special importance to something",            indonesian: "menekankan",               example: "She emphasized the importance of punctuality.",          category: "communication",    cefrLevel: "B1" },
  { word: "acknowledge", phonetic: "/əkˈnɒl.ɪdʒ/",         definition: "To accept or admit the existence of something",      indonesian: "mengakui",                 example: "He acknowledged the mistake and apologized.",            category: "social",           cefrLevel: "B1" },
  { word: "collaborate", phonetic: "/kəˈlæb.ər.eɪt/",     definition: "To work jointly with others",                        indonesian: "berkolaborasi / bekerja sama", example: "Our teams collaborate on international projects.",    category: "business",         cefrLevel: "B1" },
  { word: "consider",    phonetic: "/kənˈsɪd.ər/",         definition: "To think carefully about something",                 indonesian: "mempertimbangkan",          example: "You should consider all the options before deciding.",   category: "critical thinking", cefrLevel: "B1" },
  { word: "assume",      phonetic: "/əˈsjuːm/",            definition: "To believe something is true without proof",         indonesian: "mengasumsikan / berasumsi", example: "Don't assume you know what someone is thinking.",        category: "critical thinking", cefrLevel: "B1" },
  { word: "resolve",     phonetic: "/rɪˈzɒlv/",            definition: "To find a solution to a problem",                    indonesian: "menyelesaikan / memecahkan", example: "The team worked together to resolve the conflict.",      category: "work",             cefrLevel: "B1" },
  { word: "achieve",     phonetic: "/əˈtʃiːv/",            definition: "To succeed in doing something through effort",       indonesian: "mencapai / meraih",         example: "She achieved her goal of becoming fluent in English.",    category: "language",         cefrLevel: "B1" },
  { word: "maintain",    phonetic: "/meɪnˈteɪn/",          definition: "To keep something in its current state",             indonesian: "mempertahankan / menjaga",  example: "It's hard to maintain a conversation in a second language.", category: "language",      cefrLevel: "B1" },
  { word: "approach",    phonetic: "/əˈprəʊtʃ/",           definition: "A way of dealing with something",                    indonesian: "pendekatan",               example: "We need a new approach to teach vocabulary effectively.", category: "language",         cefrLevel: "B1" },
  { word: "involve",     phonetic: "/ɪnˈvɒlv/",            definition: "To include as a necessary part",                     indonesian: "melibatkan",               example: "Learning a language involves a lot of listening.",        category: "language",         cefrLevel: "B1" },
  { word: "support",     phonetic: "/səˈpɔːt/",            definition: "To give help or assistance to someone",              indonesian: "mendukung / dukungan",      example: "Her team supported her throughout the project.",          category: "social",           cefrLevel: "B1" },
  { word: "purpose",     phonetic: "/ˈpɜː.pəs/",           definition: "The reason for which something exists or is done",   indonesian: "tujuan / maksud",           example: "What is the purpose of this meeting?",                    category: "work",             cefrLevel: "B1" },
  { word: "advantage",   phonetic: "/ədˈvɑːn.tɪdʒ/",       definition: "A condition giving a better position",               indonesian: "keunggulan / keuntungan",   example: "Being bilingual is a huge advantage in today's job market.", category: "business",      cefrLevel: "B1" },
  { word: "benefit",     phonetic: "/ˈben.ɪ.fɪt/",         definition: "A positive or helpful result or effect",             indonesian: "manfaat / keuntungan",      example: "The benefits of exercise include improved concentration.", category: "daily life",      cefrLevel: "B1" },
  { word: "challenge",   phonetic: "/ˈtʃæl.ɪndʒ/",         definition: "A difficult task that tests your ability",           indonesian: "tantangan",                example: "Pronunciation is the biggest challenge for many learners.", category: "language",       cefrLevel: "B1" },
  { word: "opportunity", phonetic: "/ˌɒp.əˈtjuː.nɪ.ti/",   definition: "A chance to do something",                           indonesian: "kesempatan / peluang",      example: "This job is a great opportunity to improve your English.", category: "work",            cefrLevel: "B1" },
  { word: "confident",   phonetic: "/ˈkɒn.fɪ.dənt/",       definition: "Feeling sure about yourself and your abilities",     indonesian: "percaya diri",             example: "She became more confident after joining a speaking club.", category: "social",         cefrLevel: "B1" },
  { word: "fluency",     phonetic: "/ˈfluː.ən.si/",         definition: "The ability to speak or write smoothly and naturally",indonesian: "kefasihan",                example: "Fluency comes with consistent practice over time.",       category: "language",         cefrLevel: "B1" },
  { word: "context",     phonetic: "/ˈkɒn.tekst/",          definition: "The situation in which something happens",           indonesian: "konteks",                  example: "Understanding context helps you guess word meanings.",    category: "language",         cefrLevel: "B1" },

  // ── B2 ────────────────────────────────────────────────────────────────────
  { word: "articulate",  phonetic: "/ɑːˈtɪk.jʊ.lət/",     definition: "Able to express ideas clearly and effectively",      indonesian: "fasih mengungkapkan ide",   example: "She gave an articulate presentation to the board.",       category: "communication",    cefrLevel: "B2" },
  { word: "concise",     phonetic: "/kənˈsaɪs/",           definition: "Short and clear, without unnecessary detail",        indonesian: "ringkas / padat",           example: "Keep your email concise and to the point.",              category: "communication",    cefrLevel: "B2" },
  { word: "convey",      phonetic: "/kənˈveɪ/",            definition: "To communicate or make known a feeling or idea",     indonesian: "menyampaikan",              example: "His tone conveyed deep frustration.",                    category: "communication",    cefrLevel: "B2" },
  { word: "implication", phonetic: "/ˌɪm.plɪˈkeɪ.ʃən/",   definition: "A conclusion that can be drawn from something",      indonesian: "implikasi / konsekuensi",   example: "The implications of this decision are serious.",          category: "critical thinking", cefrLevel: "B2" },
  { word: "perspective", phonetic: "/pəˈspek.tɪv/",        definition: "A particular attitude or point of view",             indonesian: "perspektif / sudut pandang", example: "We need to consider the customer's perspective.",        category: "critical thinking", cefrLevel: "B2" },
  { word: "comprehensive",phonetic: "/ˌkɒm.prɪˈhen.sɪv/",  definition: "Including all or nearly all aspects",                indonesian: "komprehensif / menyeluruh", example: "The report provides a comprehensive analysis.",           category: "academic",         cefrLevel: "B2" },
  { word: "substantial", phonetic: "/səbˈstæn.ʃəl/",       definition: "Large in size, value or importance",                 indonesian: "besar / signifikan",        example: "There has been a substantial improvement in her writing.", category: "academic",        cefrLevel: "B2" },
  { word: "demonstrate", phonetic: "/ˈdem.ən.streɪt/",     definition: "To show clearly by giving evidence or examples",     indonesian: "menunjukkan / mendemonstrasikan", example: "She demonstrated her skills during the interview.",  category: "communication",    cefrLevel: "B2" },
  { word: "analyze",     phonetic: "/ˈæn.ə.laɪz/",         definition: "To examine something in detail to understand it",    indonesian: "menganalisis",              example: "We need to analyze the data before drawing conclusions.", category: "critical thinking", cefrLevel: "B2" },
  { word: "evaluate",    phonetic: "/ɪˈvæl.ju.eɪt/",       definition: "To judge or determine the value of something",       indonesian: "mengevaluasi",             example: "It's important to evaluate your progress regularly.",    category: "critical thinking", cefrLevel: "B2" },
  { word: "consequence", phonetic: "/ˈkɒn.sɪ.kwəns/",      definition: "A result or effect of an action",                    indonesian: "konsekuensi / akibat",      example: "Actions always have consequences.",                       category: "critical thinking", cefrLevel: "B2" },
  { word: "significant", phonetic: "/sɪɡˈnɪf.ɪ.kənt/",     definition: "Large enough to be noticed or important",            indonesian: "signifikan / penting",      example: "There has been a significant rise in demand.",            category: "academic",         cefrLevel: "B2" },
  { word: "indicate",    phonetic: "/ˈɪn.dɪ.keɪt/",        definition: "To show, point to, or be a sign of something",       indonesian: "menunjukkan / mengindikasikan", example: "The data indicate a positive trend.",                 category: "academic",         cefrLevel: "B2" },
  { word: "influence",   phonetic: "/ˈɪn.flu.əns/",         definition: "The power to change or affect someone or something", indonesian: "pengaruh / mempengaruhi",   example: "Social media has a huge influence on public opinion.",    category: "social",           cefrLevel: "B2" },
  { word: "contrast",    phonetic: "/ˈkɒn.trɑːst/",         definition: "A clear difference between two things",              indonesian: "kontras / perbedaan",       example: "The contrast between the two styles is striking.",        category: "academic",         cefrLevel: "B2" },
  { word: "assume",      phonetic: "/əˈsjuːm/",            definition: "To believe something without direct evidence",        indonesian: "mengasumsikan",             example: "Don't assume the meeting is cancelled without checking.", category: "work",             cefrLevel: "B2" },
  { word: "establish",   phonetic: "/ɪˈstæb.lɪʃ/",         definition: "To set up or create something permanent",            indonesian: "mendirikan / menetapkan",   example: "The company was established in 1998.",                    category: "business",         cefrLevel: "B2" },
  { word: "implement",   phonetic: "/ˈɪm.plɪ.ment/",        definition: "To put a plan or decision into effect",              indonesian: "mengimplementasikan",       example: "The new policy will be implemented next month.",          category: "work",             cefrLevel: "B2" },
  { word: "facilitate",  phonetic: "/fəˈsɪl.ɪ.teɪt/",      definition: "To make something easier or more likely to happen",  indonesian: "memfasilitasi / mempermudah", example: "Good infrastructure facilitates economic growth.",      category: "academic",         cefrLevel: "B2" },
  { word: "coherent",    phonetic: "/kəʊˈhɪər.ənt/",        definition: "Logical and consistent, easy to understand",         indonesian: "kohesif / logis",           example: "Her argument was clear and coherent.",                    category: "writing",          cefrLevel: "B2" },

  // ── C1 ────────────────────────────────────────────────────────────────────
  { word: "nuance",      phonetic: "/ˈnjuː.ɑːns/",          definition: "A subtle difference in meaning or expression",       indonesian: "nuansa / perbedaan halus",  example: "He appreciated the nuance in her argument.",             category: "language",         cefrLevel: "C1" },
  { word: "rhetoric",    phonetic: "/ˈret.ər.ɪk/",          definition: "The art of effective or persuasive speaking",        indonesian: "retorika",                 example: "His rhetoric impressed everyone in the debate.",          category: "communication",    cefrLevel: "C1" },
  { word: "pragmatic",   phonetic: "/præɡˈmæt.ɪk/",         definition: "Dealing with things practically rather than theoretically", indonesian: "pragmatis / praktis", example: "We need a pragmatic approach to solve this.",         category: "critical thinking", cefrLevel: "C1" },
  { word: "mitigate",    phonetic: "/ˈmɪt.ɪ.ɡeɪt/",         definition: "To make something less severe or serious",           indonesian: "mengurangi / meminimalkan", example: "These measures will help mitigate the risks.",           category: "academic",         cefrLevel: "C1" },
  { word: "undermine",   phonetic: "/ˌʌn.dəˈmaɪn/",         definition: "To gradually weaken or damage something",            indonesian: "melemahkan / menggerogoti", example: "Constant interruptions undermine confidence.",           category: "communication",    cefrLevel: "C1" },
  { word: "contend",     phonetic: "/kənˈtend/",             definition: "To argue or maintain that something is true",        indonesian: "berpendapat / menyatakan",  example: "She contends that the policy is counterproductive.",      category: "academic",         cefrLevel: "C1" },
  { word: "discern",     phonetic: "/dɪˈsɜːn/",             definition: "To recognize or detect something",                   indonesian: "membedakan / mengenali",    example: "It's hard to discern irony in written text.",            category: "language",         cefrLevel: "C1" },
  { word: "inherent",    phonetic: "/ɪnˈhɪər.ənt/",         definition: "Existing as a natural or essential part of something",indonesian: "inheren / melekat",         example: "There is an inherent risk in any investment.",            category: "academic",         cefrLevel: "C1" },
  { word: "articulation",phonetic: "/ɑːˌtɪk.jʊˈleɪ.ʃən/",  definition: "The clear and effective expression of ideas",        indonesian: "artikulasi / pengucapan",   example: "Her articulation during the speech was flawless.",        category: "communication",    cefrLevel: "C1" },
  { word: "substantiate",phonetic: "/səbˈstæn.ʃi.eɪt/",    definition: "To provide evidence to support a claim",             indonesian: "membuktikan / memperkuat",  example: "You need data to substantiate your argument.",           category: "academic",         cefrLevel: "C1" },
  { word: "elicit",      phonetic: "/ɪˈlɪs.ɪt/",            definition: "To draw out a response or information from someone", indonesian: "memunculkan / mendapatkan", example: "Good teachers elicit answers rather than just giving them.", category: "communication", cefrLevel: "C1" },
  { word: "allude",      phonetic: "/əˈluːd/",              definition: "To refer to something indirectly",                   indonesian: "menyinggung / merujuk secara tidak langsung", example: "She alluded to the problem without naming it.", category: "language",     cefrLevel: "C1" },
  { word: "relegate",    phonetic: "/ˈrel.ɪ.ɡeɪt/",         definition: "To assign to a lower or less important position",    indonesian: "mengabaikan / merendahkan", example: "Don't relegate speaking practice to the weekend only.",   category: "language",         cefrLevel: "C1" },
  { word: "nuanced",     phonetic: "/ˈnjuː.ɑːnst/",         definition: "Showing subtle distinctions or differences",         indonesian: "bernuansa / halus",         example: "His analysis of the poem was remarkably nuanced.",        category: "academic",         cefrLevel: "C1" },
  { word: "proliferate", phonetic: "/prəˈlɪf.ər.eɪt/",      definition: "To grow or spread rapidly",                          indonesian: "berkembang pesat / menyebar", example: "Social media platforms have proliferated in recent years.", category: "academic",    cefrLevel: "C1" },

  // ── C2 ────────────────────────────────────────────────────────────────────
  { word: "equivocate",  phonetic: "/ɪˈkwɪv.ə.keɪt/",      definition: "To speak ambiguously to avoid commitment",           indonesian: "berbicara ambigu / menghindar", example: "The politician equivocated when asked about the scandal.", category: "communication", cefrLevel: "C2" },
  { word: "ameliorate",  phonetic: "/əˈmiː.li.ər.eɪt/",     definition: "To make something bad or unsatisfactory better",     indonesian: "memperbaiki / meningkatkan kualitas", example: "Steps were taken to ameliorate living conditions.",  category: "academic",         cefrLevel: "C2" },
  { word: "perfidious",  phonetic: "/pəˈfɪd.i.əs/",         definition: "Deceitful and untrustworthy",                         indonesian: "curang / tidak dapat dipercaya", example: "His perfidious behavior destroyed the team's trust.",    category: "social",           cefrLevel: "C2" },
  { word: "obfuscate",   phonetic: "/ˈɒb.fʌ.skeɪt/",        definition: "To make something unclear or difficult to understand",indonesian: "mengaburkan / mempersulit",  example: "The report was written to obfuscate rather than inform.", category: "writing",          cefrLevel: "C2" },
  { word: "juxtapose",   phonetic: "/ˈdʒʌk.stə.pəʊz/",      definition: "To place two things close together for contrast",     indonesian: "membandingkan secara berdampingan", example: "The author juxtaposes poverty and wealth throughout the novel.", category: "writing", cefrLevel: "C2" },
  { word: "elucidate",   phonetic: "/ɪˈluː.sɪ.deɪt/",       definition: "To make something clear by explaining it in detail",  indonesian: "menjelaskan secara rinci",  example: "Could you elucidate the reasoning behind this decision?", category: "communication",   cefrLevel: "C2" },
  { word: "tenacious",   phonetic: "/tɪˈneɪ.ʃəs/",          definition: "Refusing to give up; holding firmly to something",    indonesian: "gigih / pantang menyerah",  example: "Her tenacious pursuit of fluency paid off after two years.", category: "language",      cefrLevel: "C2" },
  { word: "specious",    phonetic: "/ˈspiː.ʃəs/",           definition: "Seemingly reasonable but actually wrong or false",    indonesian: "menipu / tampak masuk akal tapi salah", example: "His specious argument fooled many listeners.",       category: "critical thinking", cefrLevel: "C2" },
  { word: "dilettante",  phonetic: "/ˈdɪl.ɪ.tænt/",         definition: "A person who dabbles in something without real depth", indonesian: "amatir / setengah-setengah", example: "She was no dilettante — she dedicated years to mastering the language.", category: "social", cefrLevel: "C2" },
  { word: "inimitable",  phonetic: "/ɪˈnɪm.ɪ.tə.bəl/",      definition: "So unique it cannot be copied",                      indonesian: "tak tertandingi / unik",    example: "Her inimitable style of speaking made her unforgettable.", category: "language",        cefrLevel: "C2" },
  { word: "laconic",     phonetic: "/ləˈkɒn.ɪk/",           definition: "Using very few words",                                indonesian: "singkat / tidak banyak bicara", example: "His laconic reply told me everything I needed to know.", category: "communication",   cefrLevel: "C2" },
  { word: "perspicacious",phonetic: "/ˌpɜː.spɪˈkeɪ.ʃəs/",   definition: "Having a ready insight; shrewd",                      indonesian: "jeli / tajam intuisinya",   example: "Her perspicacious observations impressed the entire board.", category: "critical thinking", cefrLevel: "C2" },
  { word: "garrulous",   phonetic: "/ˈɡær.ʊ.ləs/",          definition: "Excessively talkative, especially about trivial things",indonesian: "cerewet / banyak bicara",  example: "The garrulous host dominated the entire conversation.",   category: "social",           cefrLevel: "C2" },
  { word: "loquacious",  phonetic: "/ləˈkweɪ.ʃəs/",         definition: "Very talkative; fond of talking",                     indonesian: "banyak berbicara / fasih berbicara", example: "She is loquacious in her first language but quiet in English.", category: "language", cefrLevel: "C2" },
  { word: "cogent",      phonetic: "/ˈkəʊ.dʒənt/",          definition: "Clear, logical and convincing",                       indonesian: "meyakinkan / kuat (argumen)", example: "She made a cogent case for revising the curriculum.",    category: "academic",         cefrLevel: "C2" },
];


function getStudyWordsForLevel(cefrLevel: string): StudyWord[] {
  const order = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const idx = order.indexOf(cefrLevel);
  // Include all levels up to and including current level
  const levels = order.slice(0, Math.max(idx + 1, 1));
  return STUDY_WORDS.filter((w) => levels.includes(w.cefrLevel));
}

export const vocabularyRouter = router({
  // Returns curated study words + user's personal saved words merged together
  getStudyList: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.authId, ctx.userId),
      columns: { id: true, cefrLevel: true },
    });

    const curated = getStudyWordsForLevel(user?.cefrLevel ?? "B1");

    if (!user) return curated;

    // Merge personal saved words into study list (avoid duplicates by word)
    const personal = await db.query.vocabulary.findMany({
      where: eq(vocabulary.userId, user.id),
      columns: { word: true, definition: true, example: true, cefrLevel: true },
      orderBy: (v, { asc }) => asc(v.createdAt),
    });

    const curatedWords = new Set(curated.map((w) => w.word.toLowerCase()));
    const personalAsStudy: StudyWord[] = personal
      .filter((p) => !curatedWords.has(p.word.toLowerCase()))
      .map((p) => ({
        word:       p.word,
        phonetic:   "",
        definition: p.definition,
        indonesian: "",
        example:    p.example ?? "",
        category:   "personal",
        cefrLevel:  p.cefrLevel ?? user.cefrLevel ?? "B1",
      }));

    return [...curated, ...personalAsStudy];
  }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.authId, ctx.userId),
      columns: { id: true },
    });
    if (!user) return [];

    return db.query.vocabulary.findMany({
      where: eq(vocabulary.userId, user.id),
      orderBy: (v, { desc }) => desc(v.createdAt),
    });
  }),

  search: protectedProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true },
      });
      if (!user) return [];

      return db.query.vocabulary.findMany({
        where: and(
          eq(vocabulary.userId, user.id),
          ilike(vocabulary.word, `%${input.query}%`),
        ),
        limit: 20,
      });
    }),

  add: protectedProcedure
    .input(
      z.object({
        word:       z.string().min(1).max(200),
        definition: z.string().min(1),
        example:    z.string().optional(),
        cefrLevel:  z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true },
      });
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const [entry] = await db
        .insert(vocabulary)
        .values({
          userId:     user.id,
          word:       input.word,
          definition: input.definition,
          example:    input.example,
          cefrLevel:  input.cefrLevel,
        })
        .onConflictDoUpdate({
          target: [vocabulary.userId, vocabulary.word],
          set: { definition: input.definition, example: input.example },
        })
        .returning();

      return entry;
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true },
      });
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      await db
        .delete(vocabulary)
        .where(and(eq(vocabulary.id, input.id), eq(vocabulary.userId, user.id)));

      return { success: true };
    }),

  // Called after each pronunciation practice — saves mastery progress to DB
  updateMastery: protectedProcedure
    .input(z.object({
      word:       z.string().min(1),
      definition: z.string().min(1),
      example:    z.string().optional(),
      cefrLevel:  z.string().optional(),
      correct:    z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true, cefrLevel: true },
      });
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      // Upsert the word — create it if it doesn't exist, then adjust mastery
      const existing = await db.query.vocabulary.findFirst({
        where: and(eq(vocabulary.userId, user.id), eq(vocabulary.word, input.word)),
        columns: { id: true, mastery: true },
      });

      if (existing) {
        const newMastery = input.correct
          ? Math.min(5, existing.mastery + 1)
          : Math.max(0, existing.mastery - 1);
        await db
          .update(vocabulary)
          .set({ mastery: newMastery })
          .where(eq(vocabulary.id, existing.id));
        return { mastery: newMastery };
      } else {
        // First time practicing this word — insert it
        const [created] = await db
          .insert(vocabulary)
          .values({
            userId:     user.id,
            word:       input.word,
            definition: input.definition,
            example:    input.example,
            cefrLevel:  input.cefrLevel ?? user.cefrLevel ?? "B1",
            mastery:    input.correct ? 1 : 0,
          })
          .onConflictDoNothing()
          .returning({ id: vocabulary.id, mastery: vocabulary.mastery });
        return { mastery: created?.mastery ?? 0 };
      }
    }),

  // AI generates new vocabulary words tailored to user's level & domain
  generateWords: protectedProcedure
    .input(z.object({ count: z.number().int().min(5).max(20).default(10) }))
    .mutation(async ({ ctx, input }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.authId, ctx.userId),
        columns: { id: true, cefrLevel: true, domain: true },
      });
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const cefrLevel = user.cefrLevel ?? "B1";
      const domain    = user.domain ?? "general";

      // Collect existing words to avoid duplicates
      const existing = await db.query.vocabulary.findMany({
        where: eq(vocabulary.userId, user.id),
        columns: { word: true },
      });
      const curatedWords = getStudyWordsForLevel(cefrLevel).map((w) => w.word);
      const allExisting  = [
        ...curatedWords,
        ...existing.map((e) => e.word),
      ].join(", ");

      const prompt = `You are an English vocabulary expert for Indonesian learners. Generate exactly ${input.count} English vocabulary words for a learner at CEFR level ${cefrLevel} interested in the ${domain} domain.

Requirements:
- Words must be genuinely useful at ${cefrLevel} level (not too easy, not too hard)
- Relevant to ${domain} context where possible, but include general everyday words too
- Each word must be DIFFERENT from these already-known words: ${allExisting.slice(0, 800)}
- Include a variety of word types: nouns, verbs, adjectives, adverbs, phrases
- For Indonesian translations, use common, clear everyday Indonesian

Return ONLY a valid JSON array (no markdown, no code fences):
[
  {
    "word": "example",
    "phonetic": "/ɪɡˈzɑːmpəl/",
    "definition": "A thing that is representative of its type (max 12 words)",
    "indonesian": "contoh",
    "example": "Can you give me an example of this rule?",
    "category": "academic"
  }
]`;

      const raw = await complete([{ role: "user", content: prompt }], {
        model: "primary",
        temperature: 0.7,
        maxTokens: 2000,
      });

      let words: StudyWord[];
      try {
        // Strip markdown code fences if present
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        words = JSON.parse(cleaned);
        if (!Array.isArray(words)) throw new Error("not array");
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI returned invalid response" });
      }

      // Save each generated word to the user's personal vocabulary
      const saved: string[] = [];
      for (const w of words) {
        if (!w.word || !w.definition) continue;
        try {
          await db
            .insert(vocabulary)
            .values({
              userId:     user.id,
              word:       w.word.trim(),
              definition: w.definition.trim(),
              example:    w.example?.trim() ?? undefined,
              cefrLevel,
            })
            .onConflictDoNothing();
          saved.push(w.word);
        } catch {
          // skip duplicates silently
        }
      }

      return { words, saved: saved.length };
    }),
});
