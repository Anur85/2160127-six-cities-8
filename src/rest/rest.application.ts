import { inject, injectable } from 'inversify';
import express, { Express } from 'express';

import { ILogger } from '../shared/libs/logger/index.js';
import { IConfig, RestSchema } from '../shared/libs/config/index.js';
import { Component } from '../shared/types/component.enum.js';
import { IDatabaseClient } from '../shared/libs/database-client/index.js';
import { getMongoURI } from '../shared/helpers/index.js';
// import { UserModel } from '../shared/modules/user/index.js';
import { IController, ExceptionFilter } from '../shared/libs/rest/index.js';

@injectable()
export class RestApplication {
  private readonly server: Express;
  constructor(
    @inject(Component.Logger) private readonly logger: ILogger,
    @inject(Component.Config) private readonly config: IConfig<RestSchema>,
    @inject(Component.DatabaseClient) private readonly databaseClient: IDatabaseClient,
    @inject(Component.OfferController) private readonly offerController: IController,
    @inject(Component.UserController) private readonly userController: IController,
    @inject(Component.CommentController) private readonly commentController: IController,
    @inject(Component.ExceptionFilter) private readonly appExceptionFilter: ExceptionFilter,
  ) {
    this.server = express();
  }

  private async _initExceptionFilters() {
    this.server.use(this.appExceptionFilter.catch.bind(this.appExceptionFilter));
  }

  private async initDb() {
    const mongoUri = getMongoURI(
      this.config.get('DB_USER'),
      this.config.get('DB_PASSWORD'),
      this.config.get('DB_HOST'),
      this.config.get('DB_PORT'),
      this.config.get('DB_NAME'),
    );

    return this.databaseClient.connect(mongoUri);
  }

  private async _initServer() {
    const port = this.config.get('PORT');
    this.server.listen(port);
    // this.server.get('/', (_req, res) => {
    //   res.send('Hello');
    // });
  }

  private async _initControllers() {
    this.server.use('/offers', this.offerController.router);
    this.server.use('/users', this.userController.router);
    this.server.use('/comments', this.commentController.router);
  }

  private async _initMiddleware() {
    this.server.use(express.json());
  }

  public async init() {
    this.logger.info('Application initialization');
    this.logger.info(`Get value from env $DB_HOST: ${this.config.get('DB_HOST')}`);

    this.logger.info('Init app-level middleware');
    await this._initMiddleware();
    this.logger.info('App-level middleware initialization completed');

    this.logger.info('Init database...');
    await this.initDb();
    this.logger.info('Init database completed');

    this.logger.info('Init controllers');
    await this._initControllers();
    this.logger.info('Controller initialization completed');

    this.logger.info('Init exception filters');
    await this._initExceptionFilters();
    this.logger.info('Exception filters initialization compleated');


    this.logger.info('Try to init server…');
    await this._initServer();
    this.logger.info(
      `🚀 Server started on http://localhost:${this.config.get('PORT')}`
    );

    //test user down:
    // const user = await UserModel.create({
    //   name: 'Keks',
    //   email: 'test2@email.local',
    //   avatarUrl: 'keks.jpg',
    //   password: 'Unknown',
    //   isPro: true
    // });
    // const error = user.validateSync();
    // console.log(error);
  }
}
