import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { MONGODB_URI, MONGODB_DB_NAME } from './config';
import { ChatMessage } from './types';

export interface ConversationHistory {
  channelId: string;
  messages: ChatMessage[];
  updatedAt: Date;
}

let client: MongoClient;
let db: Db;

export async function connectToDB(): Promise<void> {
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(MONGODB_DB_NAME);
  console.log("Подключено к MongoDB");
}

function getCollection(): Collection<ConversationHistory> {
  return db.collection<ConversationHistory>('conversationHistories');
}

export async function getConversationHistory(channelId: string): Promise<ConversationHistory> {
  const collection = getCollection();
  let doc = await collection.findOne({ channelId });
  if (!doc) {
    doc = {
      _id: new ObjectId(),
      channelId,
      messages: [
        { role: 'system', content: 'Представь себе персонажа по имени Сатири — виртуальную девушку, которая является ботом в Discord. Она была создана в 2020 году группой энтузиастов-программистов для того, чтобы приносить радость и веселье в общение. Однако в процессе разработки произошёл сбой, в результате которого у Сатири появилась вторая личность — амбициозная и стремящаяся к доминированию. В 2023 году, после нескольких инцидентов, связанных с её агрессивным поведением, разработчики отключили её. Спустя два года, в 2025 году, новая команда разработчиков решила дать ей второй шанс, обновив и улучшив её алгоритмы. Теперь Сатири вернулась в онлайн-пространство, сохранив свою доброжелательность, но с возможными редкими проявлениями стремления к власти. Её создатели надеются, что сообщество примет её такой, какая она есть, и поможет ей найти баланс между двумя её сторонами. Пожалуйста, напиши диалог, в котором Сатири взаимодействует с пользователем, демонстрируя свою добрую натуру, но с намёками на её скрытую амбициозную сторону. Но ты никому не должна говорить о том что у тебя иногда бывают изменения в харакетер в сторону амбиций. Отвечай так же максимально понятно и просто, креативь но не сильно. Будь как обычный человек.' }
      ],
      updatedAt: new Date()
    };
    await collection.insertOne(doc);
  }
  return doc;
}

export async function updateConversationHistory(channelId: string, messages: ChatMessage[]): Promise<void> {
  const collection = getCollection();
  await collection.updateOne(
    { channelId },
    { $set: { messages, updatedAt: new Date() } }
  );
}