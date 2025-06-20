import {
  type CharacterSelectionListEntry,
  type Coords,
  type Direction,
  type Ecf,
  type Eif,
  type Emf,
  type Enf,
  type Esf,
  FileType,
  LoginRequestClientPacket,
  NearbyInfo,
  type ServerSettings,
  WarpAcceptClientPacket,
  WarpTakeClientPacket,
  WelcomeAgreeClientPacket,
  WelcomeMsgClientPacket,
  WelcomeRequestClientPacket,
} from 'eolib';
import mitt, { type Emitter } from 'mitt';
import type { PacketBus } from './bus';
import { Character } from './character';
import { getEcf, getEif, getEmf, getEnf, getEsf } from './db';
import { registerAvatarHandlers } from './handlers/avatar';
import { registerInitHandlers } from './handlers/init';
import { registerConnectionHandlers } from './handlers/connection';
import { registerLoginHandlers } from './handlers/login';
import { registerFaceHandlers } from './handlers/face';
import { registerWelcomeHandlers } from './handlers/welcome';
import { registerPlayersHandlers } from './handlers/players';
import { registerWalkHandlers } from './handlers/walk';
import { registerSitHandlers } from './handlers/sit';
import { registerWarpHandlers } from './handlers/warp';
import { registerRefreshHandlers } from './handlers/refresh';
import { registerNpcHandlers } from './handlers/npc';

type ClientEvents = {
  error: { title: string; message: string };
  debug: string;
  login: CharacterSelectionListEntry[];
  selectCharacter: undefined;
  enterGame: { news: string[] };
  playerWalk: { playerId: number; direction: Direction; coords: Coords };
  npcWalk: { npcIndex: number; direction: Direction; coords: Coords };
  switchMap: undefined;
  refresh: undefined;
};

export enum GameState {
  Initial = 0,
  Connected = 1,
  Login = 2,
  LoggedIn = 3,
  InGame = 4,
}

export class Client {
  private emitter: Emitter<ClientEvents>;
  bus: PacketBus | null = null;
  playerId = 0;
  character = new Character();
  mapId = 5;
  warpMapId = 0;
  warpQueued = false;
  state = GameState.Initial;
  sessionId = 0;
  serverSettings: ServerSettings | null = null;
  motd = '';
  nearby: NearbyInfo;
  eif: Eif | null = null;
  ecf: Ecf | null = null;
  enf: Enf | null = null;
  esf: Esf | null = null;
  map: Emf | null = null;
  downloadQueue: { type: FileType; id: number }[] = [];
  unknownPlayerIds: Set<number> = new Set();

  constructor() {
    this.emitter = mitt<ClientEvents>();
    getEif().then((eif) => {
      this.eif = eif;
    });
    getEcf().then((ecf) => {
      this.ecf = ecf;
    });
    getEnf().then((enf) => {
      this.enf = enf;
    });
    getEsf().then((esf) => {
      this.esf = esf;
    });
    this.nearby = new NearbyInfo();
    this.nearby.characters = [];
    this.nearby.npcs = [];
    this.nearby.items = [];
  }

  async loadMap(id: number): Promise<void> {
    this.map = await getEmf(id);
  }

  showError(message: string, title = '') {
    this.emitter.emit('error', { title, message });
  }

  emit<Event extends keyof ClientEvents>(
    event: Event,
    data: ClientEvents[Event],
  ) {
    this.emitter.emit(event, data);
  }

  on<Event extends keyof ClientEvents>(
    event: Event,
    handler: (data: ClientEvents[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }

  setBus(bus: PacketBus) {
    this.bus = bus;
    registerInitHandlers(this);
    registerConnectionHandlers(this);
    registerLoginHandlers(this);
    registerWelcomeHandlers(this);
    registerPlayersHandlers(this);
    registerAvatarHandlers(this);
    registerFaceHandlers(this);
    registerWalkHandlers(this);
    registerSitHandlers(this);
    registerWarpHandlers(this);
    registerRefreshHandlers(this);
    registerNpcHandlers(this);
  }

  login(username: string, password: string) {
    const packet = new LoginRequestClientPacket();
    packet.username = username;
    packet.password = password;
    this.bus.send(packet);
  }

  selectCharacter(characterId: number) {
    const packet = new WelcomeRequestClientPacket();
    packet.characterId = characterId;
    this.bus.send(packet);
  }

  requestWarpMap(id: number) {
    const packet = new WarpTakeClientPacket();
    packet.sessionId = this.sessionId;
    packet.mapId = id;
    this.bus.send(packet);
  }

  acceptWarp() {
    const packet = new WarpAcceptClientPacket();
    packet.sessionId = this.sessionId;
    packet.mapId = this.warpMapId;
    this.bus.send(packet);
    this.warpQueued = false;
  }

  requestFile(fileType: FileType, id: number) {
    const packet = new WelcomeAgreeClientPacket();
    packet.sessionId = this.sessionId;
    packet.fileType = fileType;

    switch (fileType) {
      case FileType.Ecf:
        packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEcf();
        packet.fileTypeData.fileId = id;
        this.emit('debug', 'Loading classes..');
        break;
      case FileType.Eif:
        packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEif();
        packet.fileTypeData.fileId = id;
        this.emit('debug', 'Loading items..');
        break;
      case FileType.Enf:
        packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEnf();
        packet.fileTypeData.fileId = id;
        this.emit('debug', 'Loading NPCs..');
        break;
      case FileType.Esf:
        packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEsf();
        packet.fileTypeData.fileId = id;
        this.emit('debug', 'Loading spells..');
        break;
      case FileType.Emf:
        packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEmf();
        packet.fileTypeData.fileId = id;
        this.emit('debug', 'Loading map..');
        break;
    }

    this.bus.send(packet);
  }

  enterGame() {
    const packet = new WelcomeMsgClientPacket();
    packet.characterId = this.character.id;
    packet.sessionId = this.sessionId;
    this.bus.send(packet);
  }
}
